'use strict';

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
			placeholder: 'Type a thing',
			input: ''
		}, {
			placeholder: 'And another thing',
			input: ''
		}, {
			placeholder: 'And another',
			input: ''
		}, {
			placeholder: 'Halfway there',
			input: ''
		}, {
			placeholder: 'Another',
			input: ''
		}, {
			placeholder: 'Nearly done',
			input: ''
		}, {
			placeholder: 'One more',
			input: ''
		}, {
			placeholder: 'Last one',
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
				reqData['thing' + (i + 1)] = $scope.things[i].input;
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
app.controller('PlayerGameCtrl', function ($scope, $routeParams, channel) {
	// Check that the channel exists.  Create it if a token exists from
	// which to create it.  Otherwise, redirect to the title screen.
	if (!channel) {
		if (localStorage.userToken) {
			channel.close();
			channel.open();
		} else {
			location.hash = '/home';
			return;
		}
	}
	$scope.gameId = $routeParams.gameId;
});