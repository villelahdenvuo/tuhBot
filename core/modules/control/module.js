'use strict';

function Control(config, io) {
  this.config = config;
  this.io = io;
}

Control.prototype.commands = {
  'exit': {
         op: true,
       help: 'Make the bot shutdown gracefully.',
    handler: function () { this.io.core.exit(); }
  },
  'part': {
         op: true,
       args: [{name: 'channel', description: 'Where to part'}],
       help: 'Make the bot exit current channel.',
    handler: function (i) { console.log('parting', i); this.io.send(i.net, ['PART', i.args[0]]); }
  }
}

Control.prototype.events = {
  'invite': {
         op: true,
       help: 'Allow operator to invite the bot to channels',
    handler: function (i) { this.io.send(i[0], ['JOIN', i[1]]); },
  }
};


module.exports = {
         name: 'Control',
  description: 'Core module to control the bot.',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or tuhoojabotti at IRCNet',
      version: '0.1',
       module: Control
};