'use strict';

var colors = require('colors')
  , util = require('util')
  , fs = require('fs')
  , cw = require('irc').colors.wrap
  , Log = require('./log');

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

function Channel(network, name) {
  var chan = this;
  chan.allowedEvents = ['join', 'part', '+mode', '-mode', 'pm'];
  chan.path = process.cwd() + '/' + name.toLowerCase() + '/';
  chan.modulePath = __dirname + '/modules/channel/';
  chan.isCore = false;
  chan.network = network;
  chan.name = name;
  chan.config = {};
  chan.operators = [];
  chan.commands = [];
  chan.routes = [];
  chan.modules = {};
  chan.overrides = {};
  chan.io = {};
}

Channel.prototype.init = function () {
  if (!fs.existsSync(this.path)) {
    fs.mkdirSync(this.path);
  }

  this.log = new Log(this.name, this.path + 'channel.log');

  if (!this.loadConfig()) { return false; }

  // Make sure we have log folder.
  if (!fs.existsSync(this.path + 'logs/')) {
    fs.mkdirSync(this.path + 'logs/');
  }

  this.initIO();
  this.loadOverrides();
  this.initModules();

  if (this.config.operators) {
    this.log.debug('Loading operators', this.config.operators);
    this.operators = this.config.operators.map(function (op) {
      return new RegExp(op.replace(/[-\[\]{}()+?.\\,\^$|#\s]/g, "\\$&").replace(/\*/g, '(.*?)'), 'i'); });
  }

  return true; // Success
};

Channel.prototype.initIO = function () {
  var chan = this;
  function save(cb) {
    var conf = chan.config;
    conf.modules[this.name] = this.config;
    chan.saveConfig(cb);
  }

  chan.io.mode = function (modes, targets) {
    chan.network.send.apply(chan.network, ['MODE', chan.name, modes].concat(targets));
  };
  chan.io.part = function (reason) { chan.network.send('PART', chan.name, reason || ''); };
  chan.io.isOP = function (host) { return chan.isOperator(host); };
  chan.io.kick = function (who, reason) { chan.network.send('KICK', chan.name, who, reason); };
  chan.io.save = save;
};

Channel.prototype.loadConfig = function () {
  try { this.config = JSON.parse(fs.readFileSync(this.path + 'config.json')); }
  catch(e) { // Try default config
    this.log.info('Failed to load config, falling back to default.');
    try { this.config = JSON.parse(fs.readFileSync(__dirname + '/default_channel_config.json')); }
    catch(e) { this.log.exception(e); return false; }
  }
  return true;
};

Channel.prototype.saveConfig = function(cb) {
  //console.dir(this.config, this.path);
  var confString;

  try { confString = JSON.stringify(this.config, null, '  '); }
  catch (e) {
    this.log.exception(e, 'Failed to save config.');
    cb(e);
  }

  fs.writeFile(this.path + 'config.json', confString, cb);
};

Channel.prototype.loadOverrides = function () {
  if (!fs.existsSync(this.path + 'customize.js')) { return; }
  this.log.info('Loading overrides');
  this.overrides = require(this.path + 'customize');
};

Channel.prototype.initModules = function () {
  var chan = this;

  function initModule(name, config, path, extraIO) {
    var mpath = path || chan.modulePath
      , io = extraIO || chan.io, module;

    chan.log.info('Loading module', {name: name, config: config});

    try { // Load module or override.
      module = chan.modules[name] = chan.overrides[name] ?
        chan.overrides[name] : require(mpath + name + '/module');
    } catch(e) {
      chan.log.exception(e, 'Loading module failed');
      delete chan.modules[name];
      return;
    }

    module.listeners = [];
    module.intervalIDs = [];
    module.context = {
      io: io,
      config: config,
      log: new Log(name, chan.path + 'logs/' + name + '.log')
    };

    // If the module requires special initialization, let's do it here.
    if (module.init) {
      try {
        module.init.call(module);
      } catch (e) {
        console.error('%s Module %s init failed!', 'ERROR'.red, name.yellow);
        chan.log.exception(e, 'Module init failed');
        delete chan.modules[name];
        return;
      }
    }
    // Register commands/routes/events etc.
    each(module.routes, function (n, route) { chan.registerRoute(module, n, route); }, chan);
    each(module.commands, function (n, cmd) { chan.registerCommand(module, n, cmd); }, chan);
    each(module.events, function (n, event) { chan.registerEvent(module, n, event); }, chan);
    each(module.intervals, function (n, intv) { chan.registerInterval(module, n, intv); }, chan);
  }

  // Initialize all user modules.
  each(this.config.modules, initModule);

  // Initialize builtin modules.
  var io = Object.create(chan.io, {channel: {value: chan}});
  initModule('help', {}, __dirname + '/modules/core/', io);
};

Channel.prototype.handleMessage = function (message) {
  var chan = this, cmd;

  message.hostmask = message.raw.prefix;

  function handle(route, data) {
    var context = route.module.context;
    context.log.info('Handling message', {
      message: message,
      handler: route.name,
      module: route.module.name
    });

    function format(out) {
      context.log.debug('Handler output', out);
      try { message.reply(route.formatter.call(context, out)); }
      catch (e) {
        console.error('%s Module %s formatter failed!', 'ERROR'.red, route.name.yellow);
        chan.log.exception(e, 'Module ' + route.name + ' formatter failed');
      }
    }

    try { route.handler.call(context, data, format); }
    catch (e) {
       console.error('%s Module %s handler failed!', 'ERROR'.red, route.name.yellow);
       chan.log.exception(e, 'Module ' + route.name + ' handler failed');
    }
  }

  function quoteFix(s) { return s.replace(/^"(.+?)"$/, '$1'); }

  for (var i in chan.commands) { cmd = chan.commands[i];
    if (message.text.match(cmd.route)) {
        // Parse arguments `!help lol "hello world: "` -> ['lol', 'hello world: ']
        var args = (message.text.match(/([^\s]*"[^"]+"[^\s]*)|([^ ]+)/g) || [])
          .splice(1).map(quoteFix)
        , current = cmd.args[args.length];

      if (current && !current.default) { // Missing an argument that doesn't have a default.
        message.reply(util.format("You are missing %s: %s. See `%shelp %s`", cw('light_red',
          current.name), current.description, chan.config.commandPrefix, cmd.name));
      } else {
        // Insert default values if needed.
        message.args = cmd.args.map(function (a, i) { return args[i] || a.default; })
          .concat(args.slice(cmd.args.length));

        handle(cmd, message);
      }
      return; // Command executed, nothing else to do here.
    }
  }

  chan.routes.forEach(function (r) {
    if (message.text.match(r.route)) {
      message.matches = message.text.match(r.route);
      handle(r, message);
    }
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
    if (chan.isOperator(info.hostmask)) {
      console.log('Operator', info.from.green, 'called', name.green);
      handler.call(this, info, cb);
    } else { console.log('Non-Operator', info.from.red, 'tried to call', name.red); }
  }

  command.route = new RegExp('^\\' + chan.config.commandPrefix + name + '( |$)', 'i');
  command.handler = command.op ? checkOp : handler;
  command.module = module;  // Save reference to parent module.
  command.args = command.args || [];
  command.name = name;

  chan.commands.push(command);
};

Channel.prototype.registerEvent = function registerEvent(mod, name, event) {
  var chan = this, module = mod
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
    chan.log.debug('Module tried to bind unsafe event', {name: module.name, event: event});
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
};

Channel.prototype.registerInterval = function(module, name, intv) {
  var chan = this;
  module.intervalIDs.push(setInterval(function () {
    intv.handler.call(module.context, function (out) {
      chan.say(intv.formatter(out));
    });
  }, intv.interval));
};

Channel.prototype.say = function (msg) {
  this.network.say(this.name, this.config.colors ?
    msg : msg.replace(/[\x02\x1f\x16\x0f]|\x03\d{0,2}(?:,\d{0,2})?/g, ''));
};

Channel.prototype.clear = function() {
  var chan = this;

  each(chan.modules, function (name, module) {
    chan.log.debug('Unloading module', name);
    if (module.uninit) { module.uninit.call(module); }
    module.listeners.forEach(function (listener) {
      chan.network.removeListener(listener[0], listener[1]);
    });
    module.intervalIDs.forEach(clearInterval);
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
  });
  // Reinitialize
  this.init();
  if (!this.isCore && !silent) { this.say('Rehashed modules.'); }
};

module.exports = Channel;