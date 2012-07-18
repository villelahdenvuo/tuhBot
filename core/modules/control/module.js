'use strict';

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

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
       args: [{name: 'message', description: 'Quit message', default: '<from config>'}],
       help: 'Make the bot shutdown gracefully.',
    handler: function (i) { this.io.core.exit(i.args[0] === '<from config>' ? undefined : i.args[0]); }
  },
  'part': {
         op: true,
       args: [{name: 'channel', description: 'Where to part', default: 'current'}],
       help: 'Make the bot exit a channel.',
    handler: function (i) {
      this.io.send(i.net, ['PART', i.args[0] === 'current' ? i.channel : i.args[0]]);
    }
  },
  'rehash' : {
         op: true,
       help: 'Reload modules.',
       args: [{name: 'silent', description: 'No spamming', default: 'false'}],
    handler: function (i) {
      var nets = this.io.core.networks;
      each(nets, function (name, net) {
        net.send({type: 'rehash', silent: (i.args[0] !== 'false')});
      });
      this.io.channel.rehash(); // Also rehash core channel.
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