'use strict';

var colors = require('colors')
  , util = require('util')
  , fs = require('fs')
  , cw = require('irc').colors.wrap;

function Channel(network, name) {
  this.path = process.cwd() + '/' + name + '/';
  this.modulePath = __dirname + '/modules/';
  this.network = network;
  this.name = name;
  this.config = {};
  this.operators = [];
  // "filters" for messages
  this.commands = [];
  this.routes = [];
  // modules and their overrides
  this.modules = {};
  this.overrides = {};
}

Channel.prototype.init = function () {
  // Init ALL THE THINGS.
  this.loadConfig();
  this.loadOverrides();
  this.initModules();
  this.initHelp();

  if (this.config.operators) {
    this.operators = this.config.operators.map(function (op) {
      return new RegExp(op.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&").replace(/\*/g, '(.+?)'));
    });
  }
};

Channel.prototype.initHelp = function() {
  var chan = this;

  function getHelp (command) {
    if (!command) {
      return 'Modules loaded: '
        + Object.keys(chan.modules).map(function (name) { return name; }).join(', ')
        + '\nAvailable commands: '
        + chan.commands.map(function (cmd) { return cmd.name; }).join(', ');
    } else if (command[0] === '#') {
      var module = require(chan.modulePath + command.substring(1) + '/module');
      if (!module) { return "Could not find module."; }
      var contact = module.contact ? '\nContact: ' + module.contact : '';
      return util.format("%s Made by %s%s",
        module.description, module.author, contact);
    } else {
      for (var i = chan.commands.length - 1; i >= 0; i--) {
        var cmd = chan.commands[i];
        if (cmd.name !== command) { continue; }
        return cmd.help + '\n'
         + cmd.args.map(function (arg) {
            return arg.default ?
              util.format('  [%s="%s"] - %s\n', cw('gray', arg.name), arg.default, arg.description):
              util.format('  %s - %s\n', cw('gray', arg.name), arg.description)
           });
      };
    }
  }

  var help_command = {
           op: false,
         help: 'Shows help about commands. Optional parameters are displayed in square brackets. '
             + 'Use `!help #module` to get information about modules.',
         args: [{name: 'command', description: 'Command you want to know more about', default: 'commands'}],
      handler: function (i, o) { o(i.args[0]); },
    formatter: getHelp
  };

  chan.registerCommand({}, 'help', help_command);
};

Channel.prototype.loadConfig = function () {
  try {
    this.config = JSON.parse(fs.readFileSync(this.path + 'config.json'));
  } catch(e) {
    // Try default config
    try {
      this.config = JSON.parse(fs.readFileSync(__dirname + '/default_channel_config.json'));
    } catch(e) {
      console.log('Failed to load default channel config!');
      console.log(e.stack);
      process.exit();
    }
  }
};

Channel.prototype.loadOverrides = function () {
  if (fs.existsSync(this.path + 'customize.js')) {
    this.overrides = require(this.path + 'customize');
  }
};

Channel.prototype.initModules = function () {
  var chan = this;

  function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

  function initModule(name, config) {
    console.log(chan.name.green, 'Loading module', name.green, config);

    // Load module or override.
    var module = chan.overrides[name] ?
      new (chan.overrides[name].module)(chan.exposeIO(), config) :
      new (require(chan.modulePath + name + '/module').module)(chan.exposeIO(), config);
    chan.modules[name] = module;

    // Register commands/routes/events etc.
    each(module.routes, function (name, route) { chan.registerRoute(module, name, route); }, chan);
    each(module.commands, function (name, cmd) { chan.registerCommand(module, name, cmd); }, chan);
    each(module.events, function (name, event) { chan.registerEvent(module, name, event); }, chan);
  }

  // Initialize modules
  each(this.config.modules, initModule);
};

Channel.prototype.exposeIO = function () {
  var chan = this;
  return { // Only allow some IO with Channel for modules.
    opCommand: function () { chan.registerOpCommand.apply(chan, arguments); },
      command: function () { chan.registerCommand.apply(chan, arguments); },
        route: function () { chan.registerRoute.apply(chan, arguments); },
         opOn: function () { chan.registerOpEvent.apply(chan, arguments); },
           on: function () { chan.registerEvent.apply(chan, arguments); }
  };
};

Channel.prototype.handleMessage = function (from, message, raw) {
  var chan = this, commands = this.commands, routes = this.routes;

  function output (route, out) {
    try { chan.say(route.formatter(out)); }
    catch (err) {
      console.error('%s Module %s formatter failed!', 'ERROR'.red, route.module);
      console.log(err.stack);
    }
  }

  // Search for commands.
  for (var i in commands) { var cmd = commands[i];
    if (message.match(cmd.route)) {
      var quots = /".+?"/.exec(message)
        , temp = message.replace(/.+? /, '').replace(/".+?"/, '').replace(/^\s+|\s+$/g, '')
        , args = temp.split(" ")
        , current = cmd.args[args.length];
      if (quots) {for (var i = 0; i < quots.length; i++) {args.push(quots[i].replace(/"/g, ""));}}

      if (current && !current.default) {
        chan.say(util.format("You are missing %s: %s. See `%shelp %s`",
          cw('light_red', current.name), current.description, chan.config.commandPrefix, cmd.name));
        return;
      }

      cmd.handler.call(cmd.module,
        { from: from
        , message: message
        , hostmask: raw.prefix
        , args: args
        }, function (out) { output(cmd, out); }
      ); return;
    };
  }

  // It was not a command, let's see if we have routes for it.
  routes.forEach(function (r) {
    if (message.match(r.route)) {
      r.handler.call(r.module,
        { from: from
        , message: message
        , hostmask: raw.prefix
        , matches: message.match(r.route)
        }, function (out) { output(r, out); }
      );
    };
  });
};

Channel.prototype.isOperator = function (hostmask) {
  for (var i in this.operators) {
    if (this.operators[i].test(hostmask)) { return true; }
  }
  return false;
};

Channel.prototype.registerRoute = function registerRoute(module, name, route) {
  var chan = this;

  function checkOp(info, cb) {
    if (chan.isOperator(info.hostmask)) {
      console.log('Operator', info.from.green, 'activated route', name.green);
      command.handler.call(module, info, cb);
    } else {
      console.log('Non-Operator', info.from.red, 'tried to activate route', name.red);
    }
  }

  chan.routes.push({
        route: route.route,
       module: module,
      handler: route.op ? checkOp : route.handler,
    formatter: route.formatter,
         help: route.help
  });
};

Channel.prototype.registerCommand = function registerCommand(module, name, command) {
  var chan = this;

  function checkOp(info, cb) {
    if (chan.isOperator(info.hostmask)) {
      console.log('Operator', info.from.green, 'called', name.green);
      command.handler.call(module, info, cb);
    } else {
      console.log('Non-Operator', info.from.red, 'tried to call', name.red);
    }
  }

  chan.commands.push({
        route: new RegExp('^' + chan.config.commandPrefix + name + '( |$)', 'i'),
       module: module,
      handler: command.op ? checkOp : command.handler,
    formatter: command.formatter,
         help: command.help,
         args: command.args,
         name: name
  });
};

Channel.prototype.registerEvent = function registerEvent(module, name, event) {
  var chan = this;

  function checkOp() {
    var args = arguments[0];
    if (chan.isOperator(args[args.length - 1].prefix)) {
      console.log('Operator', args[1].green, 'dispatched event', name.green);
      event.handler.apply(module, arguments);
    } else {
      console.log('Non-Operator', args[1].red, 'tried dispatch event', name.red);
    }
  }

  var module = module
    , handler = event.op ? checkOp : event.handler;

  // Only allow certain events to be binded to.
  if (['join', 'part', '+mode', '-mode'].indexOf(name) === -1) {
    console.log('Module tried to bind unsafe event:', name.red); return;
  }

  chan.network.on(name, function () {
    handler.call(module, arguments, function (out) {
      chan.network.say(chan.name, event.formatter(out));
    })
  });
}

Channel.prototype.say = function (msg) {
  this.network.say(this.name, this.config.colors ?
    msg : msg.replace(/[\x02\x1f\x16\x0f]|\x03\d{0,2}(?:,\d{0,2})?/g, ''));
};

module.exports = Channel;