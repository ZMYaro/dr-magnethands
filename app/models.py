#!/usr/bin/env python
# -*- coding: utf-8 -*-

from google.appengine.ext import ndb

class Game(ndb.Model):
	id = ndb.StringProperty() # Game code
	players = ndb.StringProperty(repeated=True) # Player IDs

class Thing(ndb.Model):
	game = ndb.StringProperty() # Game code
	player = ndb.StringProperty() # Player ID
	text = ndb.StringProperty()
