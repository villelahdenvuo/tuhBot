'use strict';

var format = require('util').format
  , c = require('irc').colors.wrap;

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

var Help = {
         name: 'Help',
  description: 'offers quick documentation for the bots modules',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '1.0'
};

function help_handler(i, o) {
  var chan = this.io.channel, op = this.io.isOP(i.hostmask)
    , cmd = i.args[0], reply = {};

  if (cmd === 'commands') {
    reply.type = 'commands';
    reply.modules = Object.keys(chan.modules).map(function (name) {
      return chan.modules[name].name;
    });
    reply.commands = (op ?
      chan.commands :
      chan.commands.filter(function (command) {
        return !command.op; // Return only non-op commands.
      })).map(function (c) { return c.name; });
  } else if (cmd.toLowerCase() === '#help') {
    reply.type = 'module';
    reply.module = chan.modules['help'];
  } else if (cmd[0] === '#') {
    var find = cmd.substring(1).toLowerCase();
    each(chan.modules, function (name, module) {
      if (module.name.toLowerCase() === find) {
        reply.module = module;
      }
    });
    reply.type = reply.module ? 'module' : 'no module';
  } else {
      for (var i = chan.commands.length - 1; i >= 0; i--) {
        var command = chan.commands[i], args = cmd.args || [];
        if (cmd === command.name) {
          reply.command = command;
          break;
        }
      }
    reply.type = reply.command ? 'command' : 'no command';
  }

  o(reply);
}

function help_formatter(i) {
  switch(i.type) {
    case 'commands':
      return format('Modules loaded: %s\nCommands: %s\nYou can ask about commands or #modules.',
        i.modules.join(', '), i.commands.join(', '));
    case 'module':
      var contact = i.module.contact ? '\nContact: ' + i.module.contact : '';
      return format("%s (%s) by %s %s.%s",
        i.module.name, i.module.version, i.module.author, i.module.description, contact);
    case 'no module':
      return 'No such module loaded in this channel.';
    case 'command':
      return i.command.help + '\n'
       + i.command.args.map(function (arg) {
          return arg.default ?
            format('  [%s="%s"] - %s\n', c('gray', arg.name), arg.default, arg.description):
            format('  %s - %s\n', c('gray', arg.name), arg.description) }).join('\n');
    case 'no command':
      return 'No help found, Check http://git.io/tuhbot for more documentation.';
  }
}

Help.commands = {
  'help': {
    help: 'Shows help about commands. Optional parameters are displayed in square brackets. '
        + 'Use "#" to get information about modules.',
    args: [{name: 'command',
            description: 'Command you want to know more about', default: 'commands'}],
    handler: help_handler,
    formatter: help_formatter
  }
};


module.exports = Help;