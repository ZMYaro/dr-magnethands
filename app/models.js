'use strict';

const mongoose = require('mongoose'),
	Schema = mongoose.Schema;

const gameSchema = new Schema({
	code: String, // Game code
	host: String, // UUID
	players: [String], // UUIDs
	status: Number
});

const thingSchema = new Schema({
	game: String, // Game code
	creator: String, // Player UUID
	assignee: String, // Player UUID
	text: String
});

exports.Game = mongoose.model('Game', gameSchema);
exports.Game.STATUS_OPEN = 0;
exports.Game.STATUS_CUT_OFF = 1;
exports.Game.STATUS_STARTED = 2;
exports.Thing = mongoose.model('Thing', thingSchema);
