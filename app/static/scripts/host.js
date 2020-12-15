'use strict';

// Host controllers
app.controller('HostCreateCtrl', function ($scope, $http, socket) {
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
		
		// Create the game socket.
		socket.open(function () {
			// When the socket is open, redirect to the game lobby.
			location.hash = '/host/' + res.data.game.code + '/lobby';
		});
	}, function (res) {
		// On error, go back home.
		alert('Unable to create game.');
		location.hash = '/home';
	});
});
app.controller('HostLobbyCtrl', function ($routeParams, $scope, $http, socket) {
	// Check that the socket exists.  Create it if a token exists from
	// which to create it.  Otherwise, redirect to the title screen.
	if (!socket.isOpen) {
		if (localStorage.userToken) {
			socket.open();
		} else {
			location.hash = '/home';
			return;
		}
	}
	$scope.gameId = $routeParams.gameId;
	// Disable the button until players join.
	$scope.disabled = true;
	$scope.buttonMessage = 'Start Game';
	$scope.playerCount = 0;
	$scope.$on(EVENT_MESSAGE, function (ev, data) {
		if (data.type == 'playerCount') {
			$scope.$apply(function () {
				$scope.playerCount = data.count;
				$scope.disabled = $scope.playerCount === 0;
			});
		}
	});
	$scope.startGame = function () {
		var reqData = {
			game_id: $scope.gameId,
			from: localStorage.userId
		};
		// Disable until a response is received.
		$scope.disabled = true;
		$scope.buttonMessage = 'Starting';
		$http({
			method: 'POST',
			url: '/api/game/start',
			data: reqData
		}).then(function (res) {
			// On success, wait for players, and then go to the game screen.
			$scope.buttonMessage = 'Waiting for players';
			if (res.data.game.status === Game.STATUS_STARTED) {
				location.hash = '/host/' + $scope.gameId + '/game';
			} else {
				$scope.$on(EVENT_MESSAGE, function (ev, data) {
					if (data.type = 'gameStart') {
						location.hash = '/host/' + $scope.gameId + '/game';
					}
				});
			}
		}, function (res) {
			// On error, prompt the host to try again.
			alert('Unable to start the game.  Please try again later.');
			$scope.buttonMessage = 'Start Game';
			$scope.disabled = false;
		});
	};
});
app.controller('HostGameCtrl', function ($routeParams, $scope, $http, socket) {
	// Check that the socket exists.  Create it if a token exists from
	// which to create it.  Otherwise, redirect to the title screen.
	if (!socket.isOpen) {
		if (localStorage.userToken) {
			socket.open();
		} else {
			location.hash = '/home';
			return;
		}
	}
	$scope.disabled = true;
	$scope.gameId = $routeParams.gameId;
	$scope.shownThings = [];
	$scope.allThings = [];
	
	$scope.addThing = function () {
		if ($scope.allThings.length > 0) {
			$scope.shownThings.unshift($scope.allThings.pop());
		}
		$scope.disabled = ($scope.allThings.length === 0);
	};
	
	var reqData = {
		game_id: $scope.gameId,
		from: localStorage.userId
	};
	$scope.getThings = function () {
		$http({
			method: 'GET',
			url: '/api/things',
			params: reqData,
		}).then(function (res) {
			// On success, check that the things were retrieved.
			if (res.data.things.length === 0) {
				// If they were not retrieved, try again.
				$scope.getThings();
				return;
			}
			// If they were, store them.
			$scope.allThings = res.data.things.map(function (thing) {
				return {
					text: thing,
					used: false
				};
			});
			$scope.addThing();
			$scope.disabled = false;
		}, function (res) {
			// On error, notify the user.
			alert('Unable to fetch the list of things.  You may need to refresh or end and restart the game.');
		});
	};
	$scope.getThings();
});
