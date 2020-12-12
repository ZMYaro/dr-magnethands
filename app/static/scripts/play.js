'use strict';

// Player controllers
app.controller('PlayerJoinCtrl', function ($scope, $http, $location) {
	$scope.disabled = false;
	$scope.buttonMessage = 'Join';
	$scope.onSubmit = function () {
		var reqData = {};
		if (localStorage.userId) {
			reqData.from = localStorage.userId
		}
		// Get the game ID, or return if no valid ID was specified.
		if (/^[a-z0-9]{4}$/.test($scope.gameId.toLowerCase())) {
			reqData.game_id = $scope.gameId.toLowerCase();
		} else {
			return;
		}
		
		// Disable the form until the request goes through.
		$scope.disabled = true;
		$scope.buttonMessage = 'Joining';
		
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
			$scope.disabled = false;
			$scope.buttonMessage = 'Join';
		});
	};
});
app.controller('PlayerLobbyCtrl', function ($scope, $routeParams, $http, channel) {
	// Check that the channel exists.  Create it if a token exists from
	// which to create it.  Otherwise, redirect to the title screen.
	if (!channel.isOpen) {
		if (localStorage.userToken) {
			channel.close();
			channel.open();
		} else {
			$location.path('/home');
			return;
		}
	}
	$scope.gameId = $routeParams.gameId;
	$scope.disabled = false;
	$scope.things = [
		{
			placeholder: 'Identity (e.g., Capt. Happenstance)',
			input: ''
		}, {
			placeholder: 'Special ability (e.g., door-fu)',
			input: ''
		}, {
			placeholder: 'Plot device (e.g., potato ex machina)',
			input: ''
		}, {
			placeholder: 'Prop (e.g., teeth of three deer)',
			input: ''
		}, {
			placeholder: 'Attribute (e.g., made of bread)',
			input: ''
		}, {
			placeholder: 'Get it?  Do the rest yourself.',
			input: ''
		}, {
			placeholder: 'Nearly there...',
			input: ''
		}, {
			placeholder: 'Last one!',
			input: ''
		}
	];
	$scope.onSubmit = function () {
		var reqData = {
			game_id: $scope.gameId,
			from: localStorage.userId
		};
		for (var i = 0; i < $scope.things.length; i++) {
			// If any input was not filled in, do not submit.
			if ($scope.things[i].input) {
				reqData['thing' + i] = $scope.things[i].input;
			} else {
				return;
			}
		}
		// Disable the form until it is sent.
		$scope.disabled = true;
		$scope.buttonMessage = 'Sending'
		
		$http({
			method: 'POST',
			url: '/api/stuff',
			data: reqData
		}).then(function (res) {
			// On success, start waiting, and then go to the game itself.
			$scope.buttonMessage = 'Waiting for other players';
			if (res.data.game.status === Game.STATUS_STARTED) {
				location.hash = '/host/' + $scope.gameId + '/game';
			} else {
				$scope.$on(EVENT_MESSAGE, function (ev, data) {
					if (data.type === 'gameStart') {
						location.hash = '/play/' + $scope.gameId + '/game';
					}
				});
			}
		}, function (res) {
			// On error, prompt the player to try again.
			alert('Something went wrong submitting your things.  Please fill out all eight and try again.  If you keep seeing this message, try quitting and re-joining the game.');
			$scope.buttonMessage = 'Submit'
			$scope.disabled = false;
		});
	};
});
app.controller('PlayerGameCtrl', function ($routeParams, $scope, $http, channel) {
	// Check that the channel exists.  Create it if a token exists from
	// which to create it.  Otherwise, redirect to the title screen.
	if (!channel.isOpen) {
		if (localStorage.userToken) {
			channel.close();
			channel.open();
		} else {
			location.hash = '/home';
			return;
		}
	}
	$scope.gameId = $routeParams.gameId;
	$scope.things = [];
	
	var reqData = {
		game_id: $scope.gameId,
		from: localStorage.userId
	};
	$scope.getThings = function () {
		$http({
			method: 'GET',
			url: '/api/stuff',
			params: reqData,
		}).then(function (res) {
			// On success, check that the things were retrieved.
			if (res.data.things.length === 0) {
				// If they were not retrieved, try again.
				$scope.getThings();
				return;
			}
			// If they were, show them.
			$scope.things = res.data.things.map(function (thing) {
				return {
					text: thing,
					used: false
				};
			});
		}, function (res) {
			// On error, notify the user.
			alert('Unable to fetch the list of things.  You may need to refresh or end and restart the game.');
		});
	};
	$scope.getThings();
});
