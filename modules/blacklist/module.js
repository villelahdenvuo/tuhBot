'use strict';

var fs = require('fs')
  , format = require('util').format;

var Blacklist = {
         name: 'Blacklist',
  description: 'allows ops to blacklist words',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.1',
         init: loadBlacklist
};

function loadBlacklist() {
  var file = this.context.file = __dirname + '/blacklist.txt';
  try {
    this.context.blacklist = fs.readFileSync(file, 'utf8')
      .split('\n')
      .filter(function (w) { return w; });
  } catch (e) {
    this.context.log.info('Failed to load blacklist.txt', e.stack);
    this.context.blacklist = [];
  }
}

function handler(info, cb) {
  var bl = this.blacklist, word = info.args[1];
  switch(info.args[0]) {
    case 'add':
      if (bl.indexOf(word) === -1) {
        bl.push(word);
        fs.appendFileSync(this.file, '\n' + word);
        cb('Word added.');
      } else { cb('Word already listed.'); }
    break;
    case 'rm':
    case 'remove':
      var i = bl.indexOf(word);
      if (i !== -1) {
        bl.splice(i, 1);
        fs.writeFileSync(this.file, bl.join('\n'));
        cb('Word removed.');
      } else { cb('Word not found.'); }
    break;
    default: cb('Invalid action.');
  }
}

Blacklist.commands = {
  'bl': {
           op: true,
         help: 'Handles the blacklist',
         args: [{name: 'command', description: 'add, rm'},
                {name: 'word', description: 'word to manipulate'}],
      handler: handler,
    formatter: function (i) { return i; }
  }
}

function wordHandler(info, cb) {
  // Ignore operators.
  if (this.io.isOP(info.hostmask)) { return; }

  this.blacklist.forEach(function checkWord(bw) {
    if (info.text.indexOf(bw) !== -1) {
      this.io.kick(info.from, 'You said a bad word! >:(');
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