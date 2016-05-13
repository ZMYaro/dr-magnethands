var app = angular.module('drMagnethands', ['ngRoute']);

app.controller('menuCtrl', function ($scope) {
	
});

app.controller('gameCtrl', function ($scope, $routeParams) {
	$scope.gameId = $routeParams.gameId
});

app.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/home', {
		templateUrl: '/static/partials/home.html',
		controller: 'menuCtrl'
	}).when('/about', {
		templateUrl: '/static/partials/about.html',
		controller: 'menuCtrl'
	}).otherwise({
		redirectTo: '/home'
	})
}]);
