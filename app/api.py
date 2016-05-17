#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
from random import choice,shuffle
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
			new_game.players = []
			new_game.status = Game.STATUS_OPEN
			new_game.put()
			return new_game

def create_user(game_id):
	while True:
		user_id = uuid4().hex
		if Game.query(Game.id == game_id, Game.players != user_id).count(limit=1) == 0:
			return user_id

def game_ready(game):
	# Check that the host has cut off entry.
	if game.status != Game.STATUS_CUT_OFF:
		return False
	
	# Get the things submitted for the game.
	for player_id in game.players:
		if Thing.query(Thing.game == game.id, Thing.player == player_id).count(limit=1) == 0:
			return False
	return True

def start_game(game):
	game.status = Game.STATUS_STARTED
	game.put()
	
	# Get the things submitted for the game.
	things = Thing.query(Thing.game == game.id).fetch(limit=None)
	shuffle(things)
	
	# Assign four to each player and inform the player the game has started.
	i = 0
	for player_id in game.players:
		for j in range(4):
			things[i].assignee = player_id
			things[i].put()
			i += 1
		channel.send_message(player_id + game.id, json.dumps({
			'type': 'gameStart'
		}))
	
	# Assign the remaining things to the host and inform the host the game has started.
	while i < len(things):
		things[i].assignee = game.host
		things[i].put()
		i += 1
	channel.send_message(game.host + game.id, json.dumps({
		'type': 'gameStart'
	}))

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

class GameStart(webapp2.RequestHandler):
	def post(self):
		self.response.headers['Content-Type'] = 'application/json'
		
		# Get the ID of the game to be joined, or 404 if none was specified.
		game_id = self.request.get('game_id')
		user_id = self.request.get('from')
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
				'error': 'The requested game was not found.'
			}))
			self.response.status_int = 404
			return
		elif game.host != user_id:
			self.response.write(json.dumps({
				'error': 'You are not the host of the requested game.'
			}))
			self.response.status_int = 403
			return
		
		if game.status == Game.STATUS_OPEN:
			game.status = Game.STATUS_CUT_OFF
			game.put()
		
		# Check whether the game is ready to start.
		if game_ready(game):
			start_game(game)
		
		self.response.write(json.dumps({
			'game': game.to_dict()
		}))

class PlayerJoin(webapp2.RequestHandler):
	def post(self):
		self.response.headers['Content-Type'] = 'application/json'
		
		# Get the ID of the game to be joined, or 404 if none was specified.
		game_id = self.request.get('game_id')
		user_id = self.request.get('from')
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
				'error': 'The requested game was not found.'
			}))
			self.response.status_int = 404
			return
		if (game.status != Game.STATUS_OPEN) and (user_id not in game.players):
			self.response.write(json.dumps({
				'error': 'The requested game is not open.'
			}))
			self.response.status_int = 403
			return
		
		# Get the user's ID, or create a new one.
		if not user_id:
			user_id = create_user(game.id)
		# If not already in, add it to the players list.
		if user_id not in game.players:
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
				'token': channel.create_channel(user_id + game.id)
			}
		}
		self.response.write(json.dumps(res))

class Stuff(webapp2.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		
		# Get the ID of the game and player, or 404 if none was specified.
		game_id = self.request.get('game_id')
		user_id = self.request.get('from')
		if not game_id:
			self.response.write(json.dumps({
				'error': 'No game code was specified.'
			}))
			self.response.status_int = 404
			return
		if not user_id:
			self.response.write(json.dumps({
				'error': 'No player ID was specified.'
			}))
			self.response.status_int = 403
			return
		
		# Get the game, or 404 if it was not found.
		game = Game.query(Game.id == game_id).get()
		if not game:
			self.response.write(json.dumps({
				'error': 'The requested game was not found.'
			}))
			self.response.status_int = 404
			return
		if (user_id != game.host) and (user_id not in game.players):
			self.response.write(json.dumps({
				'error': 'You are not in the requested game.'
			}))
			self.response.status_int = 403
			return
		
		# Get submitted things.
		res = {
			'game': game.to_dict(),
			'things': []
		}
		assigned_things = Thing.query(Thing.game == game_id, Thing.assignee == user_id).fetch(limit=None)
		if assigned_things:
			for thing in assigned_things:
				res['things'].append(thing.text)
		else:
			thing_count = None if user_id == Game.host else 4
			things = Thing.query(Thing.game == game_id, Thing.assignee == '').fetch(limit=thing_count)
			shuffle(things)
			for thing in things:
				res['things'].append(thing.text)
				thing.assignee = user_id
				thing.put()
		
		self.response.write(json.dumps(res))
		
	def post(self):
		self.response.headers['Content-Type'] = 'application/json'
		
		# Get the ID of the game and player, or 404 if none was specified.
		game_id = self.request.get('game_id')
		user_id = self.request.get('from')
		if not game_id:
			self.response.write(json.dumps({
				'error': 'No game code was specified.'
			}))
			self.response.status_int = 404
			return
		if not user_id:
			self.response.write(json.dumps({
				'error': 'No player ID was specified.'
			}))
			self.response.status_int = 404
			return
		
		# Get the game, or 404 if it was not found.
		game = Game.query(Game.id == game_id).get()
		if not game:
			self.response.write(json.dumps({
				'error': 'The requested game was not found.'
			}))
			self.response.status_int = 404
			return
		if user_id not in game.players:
			self.response.write(json.dumps({
				'error': 'You are not in the requested game.'
			}))
			self.response.status_int = 403
			return
		
		# Get each thing and store it.
		for i in range(8):
			thing_text = self.request.get('thing' + `(i + 1)`)
			thing = Thing()
			thing.game = game_id
			thing.player = user_id
			thing.text = thing_text
			thing.put()
		
		# Check whether the game is ready to start.
		if game_ready(game):
			start_game(game)
		
		self.response.write(json.dumps({
			'game': game.to_dict()
		}))

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
				
				# Remove the player's things.
				things = Thing.query(Thing.game == game.id, Thing.player == user_id).fetch(limit=None)
				for thing in things:
					thing.key.delete()
				
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
				for player_id in game.players:
					channel.send_message(player_id + game.id, json.dumps(channel_data))
				
				# Delete the game's things.
				things = Thing.query(Thing.game == game.id).fetch(limit=None)
				for thing in things:
					thing.key.delete()
				
				# Delete the game.
				game.key.delete()
		
		self.response.write('{}')


app = webapp2.WSGIApplication([
	('/api/game/create', GameCreate),
	('/api/game/start', GameStart),
	('/api/player/join', PlayerJoin),
	('/_ah/channel/disconnected', PlayerLeave),
	('/api/player/leave', PlayerLeave),
	('/api/stuff', Stuff)
])
