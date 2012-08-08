'use strict';

var Test = {
         name: 'Test',                              // any descriptive name
  description: 'demonstrates how to make modules',  // "what it does" lowercase and no trailing dot
       author: 'Ville "tuhoojabotti" Lahdenvuo',    // author information, nickname is fine
      contact: 'tuhoojabotti at gmail or IRCNet',   // contact information, you know, for support
      version: '1.33.7'                             // version string
};

//--v WORKING STUFF v--//

Test.commands = {
  'test': {
           op: false,
         help: 'Prints out a string from config.',
         args: [{name: 'prefix', description: 'Appends before the message', default: 'Me: '}],
      handler: function (i, o) { o({message: this.config.string, prefix: i.args[0] || ''}); },
    formatter: function (i) { return i.prefix + i.message; }
  }
};

Test.routes = {
  'smileys': {
        route: /(:|8|\.)-*(\)|\(|d|3|9|u|v|p|\||>|<)+/gi,
         help: 'Detects smileys in messages.',
      handler: function (i, o) { o(i.matches); },
    formatter: function (i) { return 'Found ' +
                  (i.length > 1 ? 'smileys' : 'a smiley') + ' in message: ' + i.join(', '); }
  }
};

Test.events = {
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

module.exports = Test;