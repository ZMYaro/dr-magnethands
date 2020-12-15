'use strict';

var PARTIALS_DIR = '/static/partials/',
	EVENT_MESSAGE = 'message',
	Game = {
		STATUS_OPEN: 0,
		STATUS_CUT_OFF: 1,
		STATUS_STARTED: 2
	},
	app = angular.module('drMagnethands', ['ngRoute'], function ($httpProvider) {
		$httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
		$httpProvider.defaults.transformRequest = [function (data) {
			if (angular.isObject(data)) {
				var params = [];
				angular.forEach(data, function (value, key) {
					params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
				});
				return params.join('&');
			}
			return data;
		}];
	});

app.factory('socket', function ($rootScope) {
	return {
		open: function (callback) {
			if (this.isOpen) {
				this.close();
			}
			$rootScope.socket = io();
			$rootScope.socket.emit('join', {token: localStorage.userToken});
			$rootScope.socket.on('connect', function () {
				if (typeof callback === 'function') {
					callback();
				}
			});
			$rootScope.socket.on('connect_error', function (err) {
				alert('An error occurred: ' + JSON.stringify(err));
				$rootScope.socket = undefined;
				location.hash = '/home';
			});
			$rootScope.socket.on('disconnect', function (reason) {
				if (reason !== 'io client disconnect') {
					alert('You have disconnected from the game.');
				}
				$rootScope.socket = undefined;
				location.hash = '/home';
			});
			$rootScope.socket.on('message', function (data) {
				console.log('Socket message received: ', data);
				$rootScope.$broadcast(EVENT_MESSAGE, data);
			});
		},
		close: function () {
			if (!this.isOpen) {
				return;
			}
			$rootScope.socket.close();
			$rootScope.socket = undefined;
		},
		get isOpen() {
			return !!$rootScope.socket;
		}
	};
});

app.controller('MainMenuCtrl', function ($scope, socket) {
	socket.close();
});

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/home', {
		templateUrl: PARTIALS_DIR + 'home.html',
		controller: 'MainMenuCtrl'
	}).when('/about', {
		templateUrl: PARTIALS_DIR + 'about.html',
		controller: 'MainMenuCtrl'
	}).when('/host', { // Hosts
		redirectTo: '/host/create'
	}).when('/host/create', {
		templateUrl: PARTIALS_DIR + 'host_create.html',
		controller: 'HostCreateCtrl'
	}).when('/host/:gameId/lobby', {
		templateUrl: PARTIALS_DIR + 'host_lobby.html',
		controller: 'HostLobbyCtrl'
	}).when('/host/:gameId/game', {
		templateUrl: PARTIALS_DIR + 'host_game.html',
		controller: 'HostGameCtrl'
	}).when('/play', { // Players
		redirectTo: '/play/join'
	}).when('/play/join', {
		templateUrl: PARTIALS_DIR + 'player_join.html',
		controller: 'PlayerJoinCtrl'
	}).when('/play/:gameId/lobby', {
		templateUrl: PARTIALS_DIR + 'player_lobby.html',
		controller: 'PlayerLobbyCtrl'
	}).when('/play/:gameId/game', {
		templateUrl: PARTIALS_DIR + 'player_game.html',
		controller: 'PlayerGameCtrl'
	}).otherwise({
		templateUrl: PARTIALS_DIR + 'drunk_test.html'
	})
}]);
