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
      return new RegExp(op.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&").replace(/\*/g, '(.*?)'), 'i'); });
  }
};

Channel.prototype.loadConfig = function () {
  try { this.config = JSON.parse(fs.readFileSync(this.path + 'config.json')); }
  catch(e) { // Try default config
    console.log(this.name.yellow, 'Failed to load config, falling back to default.');
    try { this.config = JSON.parse(fs.readFileSync(__dirname + '/default_channel_config.json')); }
    catch(e) { console.log('Failed to load default channel config!\n%s', e.stack); process.exit(); }
  }
};

Channel.prototype.loadOverrides = function () {
  if (fs.existsSync(this.path + 'customize.js')) {
    console.log(this.name.green, 'Loading overrides...');
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
    try { message.reply(route.formatter.call(this, out)); }
    catch (err) { console.error('%s Module %s formatter failed!\n%s',
      'ERROR'.red, route.name, err.stack); }
  }

  for (var i in chan.commands) { cmd = chan.commands[i];
    if (message.text.match(cmd.route)) {
        cmd.args = cmd.args || [];
        // Parse arguments `!help lol "hello world: "` -> ['lol', 'hello world: ']
        var args = (message.text.match(/([^\s]*"[^"]+"[^\s]*)|([^ ]+)/g) || [])
          .splice(1).map(function (s) { return s.replace(/^"(.+?)"$/, '$1') })
        , current = cmd.args && cmd.args[args.length];

      if (current && !current.default) { // Missing an argument that doesn't have a default.
        message.reply(util.format("You are missing %s: %s. See `%shelp %s`", cw('light_red',
          current.name), current.description, chan.config.commandPrefix, cmd.name));
      } else {
        message.hostmask = message.raw.prefix;
        // Insert default values if any.
        message.args = cmd.args.map(function (a, i) { return args[i] || a.default; });
        // Add rest of the arguments, if given.
        message.args.push.apply(message.args, args.slice(cmd.args.length));
        cmd.handler.call(cmd.module.context, message,
          function (out) { output.call(cmd.module.context, cmd, out); });
      } return; // Command executed, nothing to do.
    };
  }

  chan.routes.forEach(function (r) {
    if (message.text.match(r.route)) {
      r.handler.call(r.module.context,
        { from: message.from, message: message.text
        , hostmask: message.raw.prefix, matches: message.text.match(r.route) },
        function (out) { output.call(r.module.context, r, out); });
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
  var chan = this, handler = command.handler;

  function checkOp(info, cb) {
    console.dir(info);
    if (chan.isOperator(info.hostmask)) {
      console.log('Operator', info.from.green, 'called', name.green);
      handler.call(this, info, cb);
    } else { console.log('Non-Operator', info.from.red, 'tried to call', name.red); }
  };

  command.route = new RegExp('^\\' + chan.config.commandPrefix + name + '( |$)', 'i');
  command.handler = command.op ? checkOp : handler;
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
    if (module.uninit) { module.uninit.call(module); }
    module.listeners.forEach(function (listener) {
      console.log('removing listener for', listener[0]);
      chan.network.removeListener(listener[0], listener[1]);
    });
    module.timers.forEach(clearInterval);
  });
  this.routes = [];
  this.commands = [];
  this.modules = {};
};

Channel.prototype.rehash = function(silent) {
  this.clear();
  // Empty require cache, so that we can update modules.
  each(require.cache, function (file, value) {
    delete require.cache[file];
  })
  // Reinitialize
  this.init();
  if (!this.isCore && !silent) { this.say('Rehashed modules.'); }
};

module.exports = Channel;