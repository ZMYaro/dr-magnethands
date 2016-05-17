#!/usr/bin/env python
# -*- coding: utf-8 -*-

from google.appengine.ext import ndb

class Game(ndb.Model):
	STATUS_OPEN = 0
	STATUS_CUT_OFF = 1
	STATUS_STARTED = 2
	
	id = ndb.StringProperty() # Game code
	host = ndb.StringProperty() # UUID
	players = ndb.StringProperty(repeated=True) # UUIDs
	status = ndb.IntegerProperty()
	
	def to_dict(self):
		return {
			'id': self.id,
			'host': self.host,
			'players': self.players,
			'status': self.status
		}

class Thing(ndb.Model):
	game = ndb.StringProperty() # Game code
	player = ndb.StringProperty() # Player ID
	assignee = ndb.StringProperty() # Player ID
	text = ndb.StringProperty()
