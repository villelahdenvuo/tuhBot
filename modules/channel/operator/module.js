'use strict';

var Operator = {
         name: 'Operator',
  description: 'Handles channel operations',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.1'
};

Operator.commands = {
  'op': {
         op: true,
       help: 'Ops a peep.',
       args: [{name: 'who', description: 'Who to op?', default: '<caller>'}],
    handler: function (i) {
      i.args[0] = i.args[0] === '<caller>' ? i.from : i.args[0];
      this.io.mode('+' + new Array(i.args.length + 1).join('o'), i.args);
    }
  },
  'deop': {
         op: true,
       help: 'De-Ops a peep.',
       args: [{name: 'who', description: 'Who to deop?', default: '<caller>'}],
    handler: function (i) {
      i.args[0] = i.args[0] === '<caller>' ? i.from : i.args[0];
      this.io.mode('-' + new Array(i.args.length + 1).join('o'), i.args);
    }
  }
};

Operator.events = {
  'join': {
         op: true,
       help: 'Tells people when modes are added.',
    handler: function (i) { this.io.mode('+o', i[1]); }
  }
};


module.exports = Operator;