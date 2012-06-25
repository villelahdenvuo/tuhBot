'use strict';

function Control(io, config) {
  this.config = config;
  this.io = io;
}

Control.prototype.commands = {
  'exit': {
           op: true,
         help: 'Make the bot shutdown gracefully.',
      handler: function () { this.io.core.exit(); }
  },
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
       module: Control
};