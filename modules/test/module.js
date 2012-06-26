'use strict';

function Test(io, config) {
  this.config = config;
  this.io = io;
}

Test.prototype.commands = {
  'test': {
      command: 'test',
           op: false,
         help: 'Prints out a string from config.',
         args: [{name: 'prefix', description: 'Appends before the message'}],
      handler: function (i, o) { console.dir(i.args); o({message: this.config.string, prefix: i.args[0] || ''}); },
    formatter: function (o) { return i.prefix + i.message; }
  }
  // It is encouraged to organize complex features into sub-modules.
  // 'test2': require('./test-command')
}

Test.prototype.routes = {
  'smileys': {
        route: /(:|8|\.)-*(\)|\(|d|3|9|u|v|p|\||>|<)+/gi,
         help: 'Detects smileys in messages.',
      handler: function (i, o) { o(i.message); },
    formatter: function (i) { return 'Found a smiley in message: ' + i; }
  }
};

Test.prototype.events = {
  '+mode': {
           op: false,
         help: 'Tells people when modes are added.',
      handler: function (i, o) { o({someone: i[1], mode: i[2], somebody: i[3]}); },
    formatter: function (i) { return i.someone + ' gave +' + i.mode + ' to ' + i.somebody + '.'; }
  }
};

//--v PLANNING v--//

/*
Test.prototype.intervals = {
  'rss': {
         name: 'rss checker',
         help: 'Spams RSS data.',
     interval: 5000,
      handler: function (o) { o(data); },
    formatter: function (i, o) { o(formatter(i)); }
  }
};

Test.prototype.streams = {
  'test-stream': {
         help: 'Allows you to stream data to IRC.',
         init: function (o) { readableStream.pipe(o); },
    formatter: function (i, o) { i.on('data', formatterFunc); }
  }
};
*/

module.exports = {
         name: 'Test',
  description: 'A simple module to demonstrate how to make modules.',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or tuhoojabotti at IRCNet',
       module: Test
};