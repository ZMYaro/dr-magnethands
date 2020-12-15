'use strict';

const bodyParser = require('body-parser'),
	express = require('express'),
	{ v4: uuidv4 } = require('uuid'),
	Game = require('./models.js').Game,
	Thing = require('./models.js').Thing;

const GAME_ID_LENGTH = 4,
	GAME_ID_CHARS = 'abcdefghjkmnpqrstuvwxyz123456789'.split('');

/**
 * Pick a random element from an array.
 * @param {Array} arr - The array to pick from
 * @returns {Object} An element from the array
 */
Array.prototype.pickRandom = function () {
	return this[Math.floor(Math.random() * this.length)];
};

/**
 * Remove all instances of an element from an array.
 * @param {Object} elem - The element to remove
 */
Array.prototype.remove = function (elem) {
	var index;
	while ((index = this.indexOf(elem)) !== -1) {
		this.splice(index, 1);
	}
	return this;
};

/**
 * Generate a random game code.
 * @returns {String} A random series of 4 game ID characters
 */
function generateCode() {
	var code = '';
	for (let i = 0; i < GAME_ID_LENGTH; i++) {
		code += GAME_ID_CHARS.pickRandom();
	}
	return code;
}

/**
 * Create a new game instance in the database.
 * @returns {Game} The database model instance
 */
async function createGame() {
	var newGameCode,
		gameExists;
	do {
		newGameCode = generateCode();
		gameExists = await Game.exists({ code: newGameCode });
	} while (gameExists);
	
	var newGame = new Game({
		code: newGameCode,
		players: [],
		status: Game.STATUS_OPEN
	});
	
	await newGame.save();
	console.log(`Created game ${newGame.code}.`);
	return newGame;
}

/**
 * Create a new player instance in the database.
 * @param {Game} game - The game to add the player to
 * @returns {String} The UUID of the player
 */
async function createPlayerId(game) {
	var newPlayerId,
		playerExists;
	do {
		newPlayerId = uuidv4();
		playerExists = await Game.exists({code: game.code, $or: [{host: newPlayerId}, {players: newPlayerId}]});
	} while (playerExists);
	return newPlayerId;
}

/**
 * Check whether a game is ready to start.
 * @param {Game} The game model instance to check
 * @returns {Boolean} Whether the host has cut off entry and all players have submitted things
 */
async function isGameReady(game) {
	// Check that the host has cut off entry.
	if (game.status !== Game.STATUS_CUT_OFF) {
		return false;
	}
	
	// Check that each player has submitted things for the game.
	for (let playerId of game.players) {
		let playerSubmittedThings = await Thing.exists({ game: game.code, creator: playerId });
		if (!playerSubmittedThings) {
			return false;
		}
	}
	
	console.log(`Game ${game.code} is ready.`);
	return true;
}

/**
 * Assign things to players
 * @param {Game} game - The game to start
 * @param {Server} io - The Socket.IO server
 */
async function startGame(game, io) {
	// Get the things submitted for the game.
	var things = await Thing.find({ game: game.code });
	// Randomize them.
	things.sort(() => Math.random() - 0.5);
	
	// Assign 4 to each player and inform xem the game has started.
	var thingIndex = 0;
	for (let playerId of game.players) {
		for (let i = 0; i < 4; i++) {
			things[thingIndex].assignee = playerId;
			await things[thingIndex].save();
			thingIndex++;
		}
	}
	
	// Assign the remaining things to the host and inform xem the game has started.
	for(; thingIndex < things.length; thingIndex++) {
		things[thingIndex].assignee = game.host;
		await things[thingIndex].save();
	}
	
	game.status = Game.STATUS_STARTED;
	await game.save();
	
	// Inform everyone the game has started.
	io.sockets.to(game.host + game.code).emit('message', {
		type: 'gameStart'
	});
	for (let playerId of game.players) {
		io.sockets.to(playerId + game.code).emit('message', {
			type: 'gameStart'
		});
	}
	
	console.log(`Started game ${game.code}.`);
}

function handleError(res, message, code) {
	res.status(code || 500);
	res.json({ error: message });
}

// ↓↓ API request handlers ↓↓
const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.all((req, res, next) => {
	res.set('Content-Type', 'application/json');
	next();
});

router.route('/game/create')
	/** Handle a client request to create a new game. */
	.post(async function (req, res) {
		// Create a new game.
		var game = await createGame();
		
		// Get the user's ID from the request or create a new one.
		var userId = req.body['from'];
		if (!userId) {
			userId = await createPlayerId(game);
		}
		
		// Set the user as the new game's host.
		game.host = userId;
		await game.save();
		
		// Return the game and user data.
		res.json({
			game: game,
			user: {
				id: userId,
				token: (userId + game.code)
			}
		});
	});

router.route('/game/start')
	/** Handle a host request to cut off joining, and start the game if all players are ready. */
	.post(async function (req, res) {
		var gameCode = req.body['game_code'],
			userId = req.body['from'];
		// Confirm the required fields were passed.
		if (!gameCode) {
			// 404 if no game was specified.
			handleError(res, 'No game code was specified.', 404);
			return;
		}
		if (!userId) {
			handleError(res, 'No user ID was specified.', 403);
			return;
		}
		
		// Confirm the game exists.
		var game = await Game.findOne({ code: gameCode });
		if (!game) {
			handleError(res, 'The requested game was not found.', 404);
			return;
		} else if (game.host !== userId) {
			// Confirm the user is the host of the game.
			handleError(res, 'The specified user is not the host of the requested game.', 403);
			return;
		}
		
		if (game.status === Game.STATUS_OPEN) {
			game.status = Game.STATUS_CUT_OFF;
			await game.save();
		}
		
		// Start the game if all players have submitted their things.
		var gameReady = await isGameReady(game);
		if (gameReady) {
			await startGame(game, res.app.io);
		}
		
		// Send back the current state of the game, started or not.
		res.json({
			game: game
		});
	});

router.route('/player/join')
	/** Handle a client request for a player to join a game. */
	.post(async function (req, res) {
		var gameCode = req.body['game_code'],
			userId = req.body['from'];
		// Confirm the required field were passed.
		if (!gameCode) {
			handleError(res, 'No game code was specified.', 404);
			return;
		}
		
		// Confirm the game exists.
		var game = await Game.findOne({ code: gameCode });
		if (!game) {
			handleError(res, 'The requested game was not found.', 404);
			return;
		}
		// Confirm the game is open if the player is not already in.
		if (game.status !== Game.STATUS_OPEN && game.players.indexOf(userId) === -1) {
			handleError(res, 'The requested game is not open.', 403);
			return;
		}
		
		// Create a new player ID if one was not specified.
		if (!userId) {
			userId = await createPlayerId(game);
		}
		// If not already in, add it to the players list.
		if (game.players.indexOf(userId) === -1) {
			game.players.push(userId);
			await game.save();
		}
		
		// Tell the host a player was added.
		res.app.io.to(game.host + game.code).emit('message', {
			type: 'playerCount',
			count: game.players.length
		});
		
		// Return the game and user data.
		res.json({
			game: game,
			user: {
				id: userId,
				token: (userId + game.code)
			}
		});
	});

router.route('/player/leave')
	/** Handle a client request for a player to leave a game. */
	.post(async function (req, res) {
		var gameCode = req.body['game_code'],
			userId = req.body['from'];
		if (!userId) {
			handleError(res, 'No player ID was specified.', 403);
			return;
		}
		
		// Get game(s) where the user was a player or host.
		var playerGames = await Game.find({ code: gameCode, players: userId }),
			hostGames = await Game.find({ code: gameCode, host: userId });
		
		for (let game of playerGames) {
			// Remove the user from the games player list.
			game.players.remove(userId);
			await game.save();
			
			// Remove the player's things.
			await Thing.deleteMany({ game: gameCode, creator: userId });
			
			// Tell the host a player was removed.
			res.app.io.to(game.host + game.code).emit('message', {
				type: 'playerCount',
				count: game.players.length
			});
		}
		for (let game of hostGames) {
			// Tell players the host has ended the game.
			for (let playerId of game.players) {
				res.app.io.to(playerId + game.code).emit('message', {
					type: 'gameOver'
				});
			}
			
			// Delete the game's things.
			await Thing.deleteMany({ game: gameCode });
			// Delete the game.
			await game.deleteOne();
		}
		
		res.json({});
	});
	
router.route('/things')
	/** Handle a client sending a player's things for a game. */
	.get(async function (req, res) {
		var gameCode = req.query['game_code'],
			userId = req.query['from'];
		// Confirm the required fields were passed.
		if (!gameCode) {
			handleError(res, 'No game code was specified.', 404);
			return;
		}
		if (!userId) {
			handleError(res, 'No user ID was specified.', 403);
			return;
		}
		// Confirm the game exists.
		var game = await Game.findOne({ code: gameCode });
		if (!game) {
			handleError(res, 'The requested game was not found.', 404);
			return;
		}
		// Confirm the user is in the game.
		if (game.host !== userId && game.players.indexOf(userId) === -1) {
			handleError(res, 'The specified user is not in the requested game.', 403);
			return;
		}
		// Confirm the game has been started.
		if (game.status !== Game.STATUS_STARTED) {
			handleError(res, 'The requested game has not been started.', 400);
			return;
		}
		
		// Send the user xer things.
		var things = await Thing.find({ game: gameCode, assignee: userId });
		res.json({
			game: game,
			things: things.map((thing) => thing.text)
		});
	})
	/** Handle a client requesting a player's things for a game. */
	.post(async function (req, res) {
		var gameCode = req.body['game_code'],
			userId = req.body['from'];
		// Confirm the required fields were passed.
		if (!gameCode) {
			handleError(res, 'No game code was specified.', 404);
			return;
		}
		if (!userId) {
			handleError(res, 'No user ID was specified.', 403);
			return;
		}
		// Confirm the game exists.
		var game = await Game.findOne({ code: gameCode });
		if (!game) {
			handleError(res, 'The requested game was not found.', 404);
			return;
		}
		// Confirm the user is in the game.
		if (game.host !== userId && game.players.indexOf(userId) === -1) {
			handleError(res, 'The specified user is not in the requested game.', 403);
			return;
		}
		
		// Get each thing and store it.
		for (let i = 0; i < 8; i++) {
			let thingText = req.body[`thing${i}`];
			if (!thingText) {
				handleError(res, `Thing ${i} was missing!`, 422);
				return;
			}
			
			let thing = new Thing({
				game: gameCode,
				creator: userId,
				text: thingText
			});
			await thing.save();
		}
		
		// Start the game if the host cut off entry and all other players have submitted their things.
		var gameReady = await isGameReady(game);
		if (gameReady) {
			await startGame(game, res.app.io);
		}
		
		// Send back the current state of the game, started or not.
		res.json({
			game: game
		});
	});

module.exports = router;
