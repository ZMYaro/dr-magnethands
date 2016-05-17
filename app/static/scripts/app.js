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

app.factory('channel', function ($rootScope) {
	return {
		open: function (callback) {
			$rootScope.channel = new goog.appengine.Channel(localStorage.userToken);
			var handlers = {
				onopen: function () {
					if (typeof callback === 'function') {
						callback();
					}
				},
				onerror: function (err) {
					alert('Error ' + err.code + ': ' + err.description);
					$rootScope.socket = undefined;
					$rootScope.channel = undefined;
					location.hash = '/home';
				},
				onclose: function () {
					alert('The game has ended.');
					$rootScope.socket = undefined;
					$rootScope.channel = undefined;
					location.hash = '/home';
				},
				onmessage: function (msg) {
					var data = JSON.parse(msg.data);
					console.log('Socket message received: ' + msg.data);
					$rootScope.$broadcast(EVENT_MESSAGE, data);
				}
			};
			$rootScope.socket = $rootScope.channel.open(handlers);
		},
		close: function () {
			if ($rootScope.channel) {
				$rootScope.socket.onclose = function () {};
				if ($rootScope.socket && typeof $rootScope.socket.close === 'function') {
					$rootScope.socket.close();
				}
				$rootScope.socket = undefined;
				$rootScope.channel = undefined;
			}
		},
		get isOpen() {
			return !!$rootScope.socket;
		}
	};
});

app.controller('MainMenuCtrl', function ($scope, channel) {
	channel.close();
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
		redirectTo: '/home'
	})
}]);
