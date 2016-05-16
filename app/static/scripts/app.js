'use strict';

var PARTIALS_DIR = '/static/partials/',
	EVENT_MESSAGE = 'message',
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
					closeChannel();
					location.hash = '/home';
				},
				onclose: function () {
					alert('The game has ended.');
					closeChannel();
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
		}
	};
});

app.controller('MainMenuCtrl', function ($scope, channel) {
	channel.close();
});

// Host controllers
app.controller('HostCreateCtrl', function ($scope, $http, channel) {
	var reqData = {}
	if (localStorage.userId) {
		reqData.from = localStorage.userId
	}
	$http({
		method: 'POST',
		url: '/api/game/create',
		data: reqData
	}).then(function (res) {
		// On success, get data from the server.
		localStorage.userId = res.data.user.id;
		localStorage.userToken = res.data.user.token;
		
		// Create the game channel.
		channel.close();
		channel.open(function () {
			// When the socket is open, redirect to the game lobby.
			location.hash = '/host/' + res.data.game.id + '/lobby';
		});
	}, function (res) {
		// On error, go back home.
		alert('Unable to create game.');
		location.hash = '/home';
	});
});
app.controller('HostLobbyCtrl', function ($routeParams, $scope, $http, $location, channel) {
	// Check that the channel exists.  Create it if a token exists from
	// which to create it.  Otherwise, redirect to the title screen.
	if (!channel) {
		if (localStorage.userToken) {
			channel.close();
			channel.open();
		} else {
			$location.path('/home');
			return;
		}
	}
	$scope.gameId = $routeParams.gameId;
	$scope.playerCount = 0;
	$scope.$on(EVENT_MESSAGE, function (ev, data) {
		if (data.type == 'playerCount') {
			$scope.$apply(function () {
				$scope.playerCount = data.count;
			});
		}
	});
});
app.controller('HostGameCtrl', function ($routeParams, $scope, $http, $location) {
	$scope.gameId = $routeParams.gameId;
	$scope.words = [];
});

// Player controllers
app.controller('PlayerJoinCtrl', function ($scope, $http, $location) {
	$scope.onSubmit = function () {
		var reqData = {};
		if (localStorage.userId) {
			reqData.from = localStorage.userId
		}
		// Get the game ID, or return if no valid ID was specified.
		if (/^[A-Z0-9]{4}$/.test($scope.gameId.toUpperCase())) {
			reqData.game_id = $scope.gameId.toUpperCase();
		} else {
			return;
		}
		$http({
			method: 'POST',
			url: '/api/player/join',
			data: reqData
		}).then(function (res) {
			// On success, get data from the server.
			localStorage.userId = res.data.user.id;
			localStorage.userToken = res.data.user.token;
			
			// Go to the game lobby.
			$location.path('/play/' + $scope.gameId + '/lobby');
		}, function (res) {
			// On error, prompt the player to try again.
			alert('Unable to join game ' + $scope.gameId + '.  Please check you have the correct game code and try again.');
		});
	};
});
app.controller('PlayerLobbyCtrl', function ($scope, $routeParams, $http) {
	$scope.gameId = $routeParams.gameId;
});
app.controller('PlayerGameCtrl', function ($scope, $routeParams) {
	$scope.gameId = $routeParams.gameId;
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
	}).otherwise({
		redirectTo: '/home'
	})
}]);
