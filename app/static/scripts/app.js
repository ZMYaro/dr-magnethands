var PARTIALS_DIR = '/static/partials/',
	app = angular.module('drMagnethands', ['ngRoute']);

app.controller('MainMenuCtrl', function ($scope) {});

// Host controllers
app.controller('HostCreateCtrl', function ($scope, $http, $location) {
	$http.post('/api/game/create').then(function (res) {
		// On success, redirect to the game lobby.
		$location.path('/host/' + res.data.id + '/lobby');
	}, function (res) {
		// On error, go back home.
		alert('Unable to create game.');
		$location.path('/home');
	});
});
app.controller('HostLobbyCtrl', function ($scope, $routeParams, $http, $location) {
	$scope.gameId = $routeParams.gameId
	$scope.playerCount = 0
});
app.controller('HostGameCtrl', function ($scope, $routeParams, $http, $location) {
	$scope.gameId = $routeParams.gameId
	$scope.words = []
});

// Player controllers
app.controller('PlayerJoinCtrl', function ($scope, $http) {
	$scope.gameId = $routeParams.gameId
	$scope
});
app.controller('PlayerCtrl', function ($scope, $routeParams) {
	$scope.gameId = $routeParams.gameId
	$scope
});

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/home', {
		templateUrl: PARTIALS_DIR + 'home.html',
		controller: 'MainMenuCtrl'
	}).when('/about', {
		templateUrl: PARTIALS_DIR + 'about.html',
		controller: 'MainMenuCtrl'
	}).when('/host', { // Hosting
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
	}).otherwise({
		redirectTo: '/home'
	})
}]);
