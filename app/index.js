'use strict';

const express = require('express'),
	mongoose = require('mongoose'),
	path = require('path'),
	apiRouter = require('./api.js');

const PORT = process.env.PORT || 8080,
	DB_NAME = 'magnethands',
	MONGODB_URI = process.env.MONGDB_URI || `mongodb://localhost:27017/${DB_NAME}`;

// Set up Express.
const app = express();
app.set('port', PORT);

// Set up DB connection.
mongoose.connect(MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', (err) => {
	console.error(err);
	process.exit(1);
});
db.once('open', function () {
	// Start server once DB ready.
	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}...`);
	});
});

// Set up routes.
// Serve the service worker from root level `/`.
app.use('/serviceworker.js', (req, res) => res.sendFile(path.join(__dirname, '/serviceworker.js')));
app.use('/static', express.static('static'));
app.use('/api', apiRouter);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '/index.html')));
