

function Test(io, config) {
  this.io = io;
  this.config = config;
  io.command('test', this, this.test, this.testFormatter);
  io.route(/:\)/, this, this.smiley, this.smileyFormatter);
  io.on('+mode', this, this.addMode, this.addModeFormatter);
}

Test.prototype.toString = function () {
  return '[module Test]';
};

Test.prototype.test = function (info, cb) {
  cb({'message': this.config.string});
};

Test.prototype.testFormatter = function (i) {
  return i.message;
};

Test.prototype.smiley = function (info, cb) {
  cb({message: info.message});
}

Test.prototype.smileyFormatter = function (i) {
  return "Found a smiley in message: " + i.message;
};

Test.prototype.addMode = function (args, cb) {
  cb({who: args[1], what: args[2], to: args[3]});
};

Test.prototype.addModeFormatter = function (i) {
  return i.who + " gave +" + i.what + " to " + i.to + ".";
};

module.exports = Test;

/* New module api.

function Test(io, config) {
  this.config = config;
  this.io = io;
}

Test.prototype.commands = {
  'test': {
      command: 'test',
           op: false,
         help: 'Prints out a string from config.',
         args: [{name: 'prefix', description: 'Appends before the message.', optional: 'Me: '}],
      handler: function (i, o) { o({message: this.config.string, prefix: i.args[0]}); },
    formatter: function (i, o) { o(i.prefix + i.message); }
  },
  // It is encouraged to organize complex features into sub-modules.
  'test2': require('./test-command')
}

Test.prototype.routes = {
  'smileys': {
        route: /(:|8|\.)-*(\)|\(|d|3|9|u|v)+/gi,
           op: false,
         help: 'Detects smileys in messages.',
      handler: function (i, o) { o(i.message); },
    formatter: function (i, o) { o('Found a smiley in message: ' + i); }
  }
};

Test.prototype.events = {
  '+mode': {
           op: false,
         help: 'Tells people when modes are added.',
      handler: function (i, o) { o({someone: args[1], mode: args[2], somebody: args[3]}); },
    formatter: function (i, o) { o(i.someone + ' gave +' + i.mode + ' to ' + i.somebody + '.'); }
  }
};

//--v PLANNING v--//

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


module.exports = {
         name: 'Test',
  description: 'A simple module to demonstrate how to make modules.',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or tuhoojabotti at IRCNet',
       module: Test
};

*/