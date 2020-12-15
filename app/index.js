'use strict';

const express = require('express'),
	http = require('http'),
	mongoose = require('mongoose'),
	path = require('path'),
	socketio = require('socket.io'),
	apiRouter = require('./api.js');

const PORT = process.env.PORT || 8080,
	DB_NAME = 'magnethands',
	MONGODB_URI = process.env.MONGDB_URI || `mongodb://localhost:27017/${DB_NAME}`;

// Set up Express.
const app = express(),
	server = http.createServer(app);
app.set('port', PORT);

// Set up Socket.IO.
app.io = socketio(server);
app.io.on('connection', (socket) => {
	// Attach socket to the app so it can be accessed from router modules.
	//app.socket = socket;
	socket.on('join', function (data) {
		if (!data.token) {
			return;
		}
		socket.join(data.token);
	});
});

// Set up DB connection.
mongoose.connect(MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', (err) => {
	console.error(err);
	process.exit(1);
});
db.once('open', function () {
	// Start server once DB ready.
	server.listen(PORT, () => {
		console.log(`Listening on port ${PORT}...`);
	});
});

// Set up routes.
// Serve the service worker from root level `/`.
app.use('/serviceworker.js', (req, res) => res.sendFile(path.join(__dirname, '/serviceworker.js')));
app.use('/static', express.static('static'));
app.use('/api', apiRouter);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '/index.html')));
