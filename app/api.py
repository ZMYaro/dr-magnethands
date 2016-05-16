#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
from random import choice
from string import ascii_uppercase, digits
from uuid import uuid4

import webapp2

from google.appengine.api import channel

from models import Game,Thing


GAME_ID_LENGTH = 4
GAME_ID_CHARS = ascii_uppercase.replace('I', '').replace('O', '') + digits.replace('0', '')

def create_game():
	while True:
		game_id = ''.join(choice(GAME_ID_CHARS) for i in range(GAME_ID_LENGTH))
		if Game.query(Game.id == game_id).count(limit=1) == 0:
			new_game = Game()
			new_game.id = game_id
			new_game.put()
			return new_game

def create_user(game_id):
	while True:
		user_id = uuid4().hex
		if Game.query(Game.id == game_id, Game.players != user_id).count(limit=1) == 0:
			return user_id

class GameCreate(webapp2.RequestHandler):
	def post(self):
		# Create a new game.
		game = create_game()
		
		# Get the user's ID or create a new one.
		user_id = self.request.get('from')
		if not user_id:
			user_id = create_user(game.id)
		
		# Set the user as the new game's host.
		game.host = user_id
		game.put()
		
		# Return the game and user data.
		res = {
			'game': game.to_dict(),
			'user': {
				'id': user_id,
				'token': channel.create_channel(game.host + game.id)
			}
		}
		self.response.headers['Content-Type'] = 'application/json'
		self.response.write(json.dumps(res))

class PlayerJoin(webapp2.RequestHandler):
	def post(self):
		self.response.headers['Content-Type'] = 'application/json'
		
		# Get the ID of the game to be joined, or 404 if none was specified.
		game_id = self.request.get('game_id')
		if not game_id:
			self.response.write(json.dumps({
				'error': 'No game code was specified.'
			}))
			self.response.status_int = 404
			return
		
		# Get the game to be joined, or 404 if it was not found.
		game = Game.query(Game.id == game_id).get()
		if not game:
			self.response.write(json.dumps({
				'error': 'The requested game code was not found.'
			}))
			self.response.status_int = 404
			return
		
		# Get the user's ID or create a new one.
		user_id = self.request.get('from')
		if (not user_id) or (user_id in game.players):
			user_id = create_user(game.id)
		
		# Add the user to the players list.
		game.players.append(user_id)
		game.put()
		
		# Tell the host a player was added.
		channel_data = {
			'type': 'playerCount',
			'count': len(game.players)
		}
		channel.send_message(game.host + game.id, json.dumps(channel_data))
		
		# Return the game and user data.
		res = {
			'game': game.to_dict(),
			'user': {
				'id': user_id,
				'token': channel.create_channel(game.host + game.id)
			}
		}
		self.response.write(json.dumps(res))

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
		
		user_id = self.request.get('from')
		
		if user_id:
			game_id = user_id[-4:]
			user_id = user_id[:-4]
			player_games = Game.query(Game.id == game_id, Game.players == user_id).fetch(limit=None)
			host_games = Game.query(Game.id == game_id, Game.host == user_id).fetch(limit=None)
			
			for game in player_games:
				# Remove the player from the list.
				game.players.remove(user_id)
				game.put()
				
				# Tell the host a player was removed.
				channel_data = {
					'type': 'playerCount',
					'count': len(game.players)
				}
				channel.send_message(game.host + game.id, json.dumps(channel_data))
			
			for game in host_games:
				# Tell players the host has ended the game.
				channel_data = {
					'type': 'gameOver'
				}
				for player in game.players:
					channel.send_message(player + game.id, json.dumps(channel_data))
				
				# Delete the game.
				game.key.delete()
		
		self.response.write('{}')


app = webapp2.WSGIApplication([
	('/api/game/create', GameCreate),
	('/api/player/join', PlayerJoin),
	('/_ah/channel/disconnected', PlayerLeave),
	('/api/player/leave', PlayerLeave),
	('/api/stuff', Stuff)
])
