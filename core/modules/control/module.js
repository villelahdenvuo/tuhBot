'use strict';

var Control = {
         name: 'Control',
  description: 'Core module to control the bot.',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.2'
};

Control.commands = {
  'exit': {
         op: true,
       help: 'Make the bot shutdown gracefully.',
    handler: function () { this.io.core.exit(); }
  },
  'part': {
         op: true,
       args: [{name: 'channel', description: 'Where to part', default: 'current'}],
       help: 'Make the bot exit a channel.',
    handler: function (i) {
      this.io.send(i.net, ['PART', i.args[0] == 'current' ? i.channel : i.args[0]]);
    }
  }
};

Control.events = {
  'invite': {
         op: true,
       help: 'Allow operator to invite the bot to channels',
    handler: function (i) { this.io.send(i[0], ['JOIN', i[1]]); },
  }
};


module.exports = Control;