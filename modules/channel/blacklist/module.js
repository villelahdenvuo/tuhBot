'use strict';

var fs = require('fs')
  , format = require('util').format;

var Blacklist = {
         name: 'Blacklist',
  description: 'allows ops to blacklist words',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '1.4',
         init: loadBlacklist
};

function loadBlacklist() {
  if (!this.context.config.words) { this.context.config.words = []; };
  var config = this.context.config;
  this.context.blacklist = {
    add: function (w) { config.words.push(w); },
    has: function (w) { return config.words.indexOf(w) !== -1; },
    del: function (w) { config.words.splice(config.words.indexOf(w), 1); },
    get: function ( ) { return config.words; }
  };
}

function handler(info, cb) {
  var word = info.args[1];
  if (word === '<word>' && info.args[0] !== 'ls') { info.args[0] = 'fail'; }
  switch(info.args[0]) {
    case '+':
    case 'add':
      if (!this.blacklist.has(word)) {
        this.blacklist.add(word);
        this.io.save();
        cb('Word added.');
      } else { cb('Word already listed.'); }
    break;
    case '-':
    case 'rm':
    case 'remove':
      if (this.blacklist.has(word)) {
        this.blacklist.del(word);
        this.io.save();
        cb('Word removed.');
      } else { cb('Word not found.'); }
    break;
    case 'ls':
      cb('Blacklisted words: ' + this.blacklist.get().join(', '));
    break;
    case 'fail':
      cb('Missing word, you need help.');
    break;
    default: cb('Invalid action.');
  }
  console.dir(this.config);
}

Blacklist.commands = {
  'bl': {
           op: true,
         help: 'Handles the blacklist.',
         args: [{name: 'action', description: 'add, rm, ls'},
                {name: 'word', description: 'word to manipulate', default: '<word>'}],
      handler: handler,
    formatter: function (i) { return i; }
  }
}

function wordHandler(info, cb) {
  // Ignore operators.
  if (this.io.isOP(info.hostmask)) { return; }

  this.blacklist.get().forEach(function checkWord(bw) {
    if (info.text.toLowerCase().indexOf(bw.toLowerCase()) !== -1) {
      this.io.kick(info.from, this.config.message || 'You said a bad word! >:(');
    }
  }, this);
}

Blacklist.routes = {
  'blacklist': {
    route: /.*/,
    help: 'Catches blacklisted words.',
    handler: wordHandler
  }
};

module.exports = Blacklist;