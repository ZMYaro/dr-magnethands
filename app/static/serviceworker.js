'use strict';

const CACHE_VERSION = '2020-12-17, v1';

this.addEventListener('install', function (event) {
	event.waitUntil(
		caches.open(CACHE_VERSION).then(function (cache) {
			cache.addAll([
				'/images/header_bg.svg',
				'/images/header_bg_dark.svg',
				'/images/icon_about.svg',
				'/images/icon_back.svg',
				'/images/icon_close.svg',
				'/images/icon_join.svg',
				'/images/icon_new.svg',
				'/images/silhouette.png',
				'/images/title.png',
				'/partials/about.html',
				'/partials/drunk_test.html',
				'/partials/home.html',
				'/partials/host_create.html',
				'/partials/host_game.html',
				'/partials/host_lobby.html',
				'/partials/player_game.html',
				'/partials/player_join.html',
				'/partials/player_lobby.html',
				'/styles/libs/material-depth.css',
				'/styles/libs/material-elements.css',
				'/styles/libs/material-widgets.css',
				'/styles/styles.css'
			]);
			
			return cache.addAll([
				'/manifest.webmanifest',
				'/offline.html',
				'/images/favicon.ico',
				'/images/icon.png',
				'/images/offline.png',
				'/scripts/libs/material-touch.js',
				'/styles/libs/material-elements.css',
				'/styles/libs/material-depth.css',
				'/styles/libs/material-widgets.css',
				'/styles/styles.css'
			]);
		})
	);
});

this.addEventListener('activate', function (event) {
	event.waitUntil(
		caches.keys().then(function (cacheList) {
			return Promise.all(cacheList.map(function (cacheKey) {
				if (cacheKey !== CACHE_VERSION) {
					return caches.delete(cacheKey);
				}
			}));
		})
	);
});

this.addEventListener('fetch', function (event) {
	event.respondWith(
		caches.match(event.request).then(function (response) {
			if (response) {
				// If cached, serve from cache.
				return response;
			}
			return fetch(event.request).then(function (response) {
				// If not cached, attempt to load from server.
				return response;
			}).catch(function (error) {
				// If unable to load, return the offline page.
				return caches.match('/offline.html');
			})
		})
	);
});
