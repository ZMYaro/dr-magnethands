#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json

from google.appengine.ext import ndb

class Game(ndb.Model):
	id = ndb.StringProperty() # Game code
	players = ndb.StringProperty(repeated=True) # Player IDs
	
	def to_json(self):
		json_dict = {
			'id': self.id,
			'players': self.players
		}
		return json.dumps(json_dict)

class Thing(ndb.Model):
	game = ndb.StringProperty() # Game code
	player = ndb.StringProperty() # Player ID
	text = ndb.StringProperty()
