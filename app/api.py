#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
from random import choice
from string import ascii_uppercase, digits

import webapp2

from models import Game,Thing


GAME_ID_LENGTH = 4


def create_game():
	while True:
		game_id = ''.join(choice(ascii_uppercase + digits) for i in range(GAME_ID_LENGTH))
		if Game.query(Game.id == game_id).count(limit=1) == 0:
			new_game = Game()
			new_game.id = game_id
			return new_game

class GameCreate(webapp2.RequestHandler):
	def post(self):
		new_game = create_game()
		
		self.response.headers['Content-Type'] = 'application/json'
		self.response.write(new_game.to_json())

class PlayerJoin(webapp2.RequestHandler):
	def post(self):
		self.response.headers['Content-Type'] = 'application/json'
		self.response.write('"TODO"')

class Stuff(webapp2.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		self.response.write('"TODO"')
	def post(self):
		self.response.headers['Content-Type'] = 'application/json'
		self.response.write('"TODO"')

class PlayerLeave(webapp2.RequestHandler):
	def post(self):
		self.response.headers['Content-Type'] = 'application/json'
		self.response.write('"TODO"')


app = webapp2.WSGIApplication([
	('/api/game/create', GameCreate),
	('/api/player/join', PlayerJoin),
	('/api/player/leave', PlayerLeave),
	('/api/stuff', Stuff)
])
