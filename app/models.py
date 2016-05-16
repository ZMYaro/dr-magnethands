#!/usr/bin/env python
# -*- coding: utf-8 -*-

from google.appengine.ext import ndb

class Game(ndb.Model):
	id = ndb.StringProperty() # Game code
	host = ndb.StringProperty() # UUID
	players = ndb.StringProperty(repeated=True) # UUIDs
	
	def to_dict(self):
		return {
			'id': self.id,
			'players': self.players
		}

class Thing(ndb.Model):
	game = ndb.StringProperty() # Game code
	player = ndb.StringProperty() # Player ID
	text = ndb.StringProperty()
