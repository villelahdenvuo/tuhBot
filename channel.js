'use strict';

var colors = require('colors')
  , util = require('util')
  , fs = require('fs')
  , cw = require('irc').colors.wrap
  , builtins = require('./builtins');

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

function Channel(network, name) {
  this.allowedEvents = ['join', 'part', '+mode', '-mode'];
  this.path = process.cwd() + '/' + name.toLowerCase() + '/';
  this.modulePath = __dirname + '/modules/';
  this.isCore = false;
  this.network = network;
  this.name = name;
  this.config = {};
  this.operators = [];
  this.commands = [];
  this.routes = [];
  this.modules = {};
  this.overrides = {};
  this.io = {};
}

Channel.prototype.init = function () {
  this.loadConfig();
  this.loadOverrides();
  this.initModules();
  builtins(this);

  if (this.config.operators) {
    this.operators = this.config.operators.map(function (op) {
      return new RegExp(op.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&").replace(/\*/g, '(.+?)')); });
  }
};

<<<<<<< HEAD
=======
Channel.prototype.initHelp = function() {
  var chan = this, getHelp = function getHelp(command) {
    if (command === 'commands') {
      return 'Modules loaded: '
        + Object.keys(chan.modules).map(function (name) { return name; }).join(', ')
        + '\nAvailable commands: '
        + chan.commands.map(function (cmd) { return cmd.name; }).join(', ');
    } else if (command[0] === '#') {
      var module = require(chan.modulePath + command.substring(1) + '/module');
      if (!module) { return "Could not find module."; }
      var contact = module.contact ? '\nContact: ' + module.contact : '';
      return util.format("%s (%s) by %s %s.%s",
        module.name, module.version, module.author, module.description, contact);
    } else {
      for (var i = chan.commands.length - 1; i >= 0; i--) {
        var cmd = chan.commands[i];
        if (cmd.name !== command) { continue; }
        return cmd.help + '\n'
         + cmd.args.map(function (arg) {
            return arg.default ?
              util.format('  [%s="%s"] - %s\n', cw('gray', arg.name), arg.default, arg.description):
              util.format('  %s - %s\n', cw('gray', arg.name), arg.description) }).join('\n');
      } return 'No help found. See http://git.io/tuhbot for wiki.';
    }
  };

  chan.registerCommand({}, 'help', {
    help: 'Shows help about commands. Optional parameters are displayed in square brackets. '
        + 'Use "#" to get information about modules.',
    args: [{name: 'command'
          , description: 'Command you want to know more about', default: 'commands'}],
    handler: function (i, o) { o(i.args[0]); },
    formatter: getHelp
  });
};

>>>>>>> 71b50677c28644ba6532518801ef52c5a47ca2ab
Channel.prototype.loadConfig = function () {
  try { this.config = JSON.parse(fs.readFileSync(this.path + 'config.json')); }
  catch(e) { // Try default config
    console.error(e.stack);
    try { this.config = JSON.parse(fs.readFileSync(__dirname + '/default_channel_config.json')); }
    catch(e) { console.log('Failed to load default channel config!\n%s', e.stack); process.exit(); }
  }
};

Channel.prototype.loadOverrides = function () {
  if (fs.existsSync(this.path + 'customize.js')) {
    console.log('Loading overrides...');
    this.overrides = require(this.path + 'customize'); }
};

Channel.prototype.initModules = function () {
  var chan = this;

  function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

  function initModule(name, config) {
    console.log(chan.name.green, 'Loading module', name.green, config);
    // Load module or override.
    var module = chan.modules[name] = chan.overrides[name] ?
      chan.overrides[name] : require(chan.modulePath + name + '/module');
    module.listeners = [];
    module.timers = [];
    module.context = {
      io: chan.io,
      config: config
    };
    // If the module requires special initialization, let's do it here.
    if (module.init) { module.init.call(module); }
    // Register commands/routes/events etc.
    each(module.routes, function (n, route) { chan.registerRoute(module, n, route); }, chan);
    each(module.commands, function (n, cmd) { chan.registerCommand(module, n, cmd); }, chan);
    each(module.events, function (n, event) { chan.registerEvent(module, n, event); }, chan);
    each(module.intervals, function (n, intv) { chan.registerInterval(module, n, intv); }, chan);
  }

  // Initialize modules
  each(this.config.modules, initModule);
};

Channel.prototype.handleMessage = function (message) {
  var chan = this, cmd, output = function output (route, out) {
    try { message.reply(route.formatter(out)); }
    catch (err) { console.error('%s Module %s formatter failed!\n%s',
      'ERROR'.red, route.name, err.stack); }
  }

  for (var i in chan.commands) { cmd = chan.commands[i];
    if (message.text.match(cmd.route)) {
        cmd.args = cmd.args || [];
        // Parse arguments `!help lol "hello world: "` -> ['lol', 'hello world: ']
        var allArgs, args = (message.text.match(/([^\s]*"[^"]+"[^\s]*)|([^ ]+)/g) || [])
          .splice(1).map(function (s) { return s.replace(/^"(.+?)"$/, '$1') })
        , current = cmd.args && cmd.args[args.length];

      if (current && !current.default) { // Missing an argument that doesn't have a default.
        message.reply(util.format("You are missing %s: %s. See `%shelp %s`", cw('light_red',
          current.name), current.description, chan.config.commandPrefix, cmd.name));
      } else {
        message.hostmask = message.raw.prefix;
        message.args = cmd.args.map(function (a, i) { return args[i] || a.default; });
        cmd.handler.call(cmd.module.context, message,
          function (out) { output(cmd, out); });
      } return; // Command executed, nothing to do.
    };
  }

  chan.routes.forEach(function (r) {
    if (message.text.match(r.route)) {
      r.handler.call(r.module.context,
        { from: message.from, message: message.text
        , hostmask: message.raw.prefix, matches: message.text.match(r.route) },
        function (out) { output(r, out); });
    };
  });
};

Channel.prototype.isOperator = function (hostmask) {
  for (var i in this.operators) {
    if (this.operators[i].test(hostmask)) { return true; }
  } return false;
};

Channel.prototype.registerRoute = function registerRoute(module, name, route) {
  var chan = this, handler = route.handler, checkOp = function checkOp(info, cb) {
    if (chan.isOperator(info.hostmask)) {
      console.log('Operator', info.from.green, 'activated route', name.green);
      handler.call(module.context, info, cb);
    } else { console.log('Non-Operator', info.from.red, 'tried to activate route', name.red); }
  };

  route.handler = route.op ? checkOp : route.handler;
  route.module = module;
  route.name = name;

  chan.routes.push(route);
};

Channel.prototype.registerCommand = function registerCommand(module, name, command) {
  var chan = this, handler = command.handler, checkOp = function checkOp(info, cb) {
    if (chan.isOperator(info.hostmask)) {
      console.log('Operator', info.from.green, 'called', name.green);
      handler.call(module.context, info, cb);
    } else { console.log('Non-Operator', info.from.red, 'tried to call', name.red); }
  };

  command.route = new RegExp('^\\' + chan.config.commandPrefix + name + '( |$)', 'i');
  command.handler = command.op ? checkOp : command.handler;
  command.module = module;  // Save reference to parent module.
  command.name = name;

  chan.commands.push(command);
};

Channel.prototype.registerEvent = function registerEvent(module, name, event) {
  var chan = this, module = module
    , handler = !event.op ? event.handler :
  function checkOp() {
    var args = arguments[0];
    if (chan.isOperator(args[args.length - 1].prefix)) {
      console.log('Operator', args[1].green, 'dispatched event', name.green);
      event.handler.apply(module.context, arguments);
    } else {
      console.log('Non-Operator', args[1].red, 'tried dispatch event', name.red);
    }
  };

  if (chan.allowedEvents.indexOf(name) === -1) {
    console.log('Module tried to bind unsafe event:', name.red);
    return;
  }

  var onEvent = function () {
    handler.call(module.context, arguments, function (out) {
      if (chan.isCore) { // If this is core channel the first argument is the network name.
        chan.network.say(arguments[0], chan.name, event.formatter(out));
      } else {
        chan.say(event.formatter(out));
      }
    });
  };

  // Register listener
  chan.network.on(name, onEvent);
  module.listeners.push([name, onEvent]);
}

Channel.prototype.registerInterval = function(module, name, intv) {
  var chan = this;
  var interval= setInterval(function () {
    intv.handler.call(module.context, function (out) {
      chan.say(intv.formatter(out));
    })
  }, intv.interval)
  module.timers.push(interval);
};

Channel.prototype.say = function (msg) {
  this.network.say(this.name, this.config.colors ?
    msg : msg.replace(/[\x02\x1f\x16\x0f]|\x03\d{0,2}(?:,\d{0,2})?/g, ''));
};

Channel.prototype.clear = function() {
  var chan = this;

  each(chan.modules, function (name, module) {
    module.listeners.forEach(function (listener) {
      console.log('removing listener for', listener[0]);
      chan.network.removeListener(listener[0], listener[1]);
    });
    module.timers.forEach(clearTimeout);
  });
  this.routes = [];
  this.commands = [];
  this.modules = {};
};

Channel.prototype.rehash = function() {
  this.clear();
  // Empty require cache, so that we can update modules.
  each(require.cache, function (file, value) {
    delete require.cache[file];
  })
  // Reinitialize
  this.init();
  if (!this.isCore) { this.say('Rehashed modules.'); }
};

module.exports = Channel;