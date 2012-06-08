'use strict';

var fs = require('fs')
  , path = require('path')
  , colors = require('colors');

function Channel(network, name) {
  this.path = process.cwd() + '/' + name + '/';
  this.network = network;
  this.name = name;
  this.config = {};
  // "filters" for messages
  this.commands = [];
  this.routes = [];
  // modules and their overrides
  this.modules = {};
  this.overrides = {};
  // Init ALL THE THINGS.
  this.loadConfig();
  this.loadOverrides();
  this.initModules();
}

Channel.prototype.loadConfig = function () {
  this.config = JSON.parse(fs.readFileSync(this.path + 'config.json'));
};

Channel.prototype.loadOverrides = function () {
  if (path.existsSync(this.path + 'customize.js')) {
    this.overrides = require(this.path + 'customize');
  }
};

Channel.prototype.initModules = function () {
  // Initialize modules
  Object.keys(this.config.modules).forEach(function (name) {
    this.initModule.call(this, name, this.config.modules[name])
  }, this);
};

Channel.prototype.exposeIO = function () {
  var chan = this;
  return { // Only allow some IO with Channel for modules.
    command: function () { chan.registerCommand.apply(chan, arguments); },
      route: function () { chan.registerRoute.apply(chan, arguments); },
         on: function () { chan.registerEvent.apply(chan, arguments); }
  };
};

Channel.prototype.initModule = function (module, config) {
  console.log('Loading module', module.green, config);
  if (this.overrides[module]) {
    this.modules[module] = new this.overrides[module](this.exposeIO(), config);
  } else {
    this.modules[module] =
      new (require(__dirname + '/modules/' + module + '/module'))(this.exposeIO(), config);
  }
};

Channel.prototype.handleMessage = function (from, message) {
  var chan = this, commands = this.commands, routes = this.routes;

  function handleRoute(r) {
    r.handler.call(r.module, {from: from, message: message}, function (out) {
      try { chan.say(r.formatter(out)); }
      catch (err) {
        console.error('%s Module %s formatter failed!', 'ERROR'.red, r.module);
        console.log(err.stack);
      }
    });
  }

  // Search for commands.
  for (var i in commands) { var r = commands[i];
    if (r.route.test(message)) { handleRoute(r); return; };
  }

  // It was not a command, let's see if we have routes for it.
  routes.forEach(function (r) {
    if (r.route.test(message)) { handleRoute(r); };
  });
};

Channel.prototype.registerRoute = function (route, module, handler, formatter) {
  this.routes.push({route: route, module: module, handler: handler, formatter: formatter});
};

// A shorthand for routes for commands.
Channel.prototype.registerCommand = function (command, module, handler, formatter) {
  this.commands.push({
    route: new RegExp('^' + this.config.commandPrefix + command + '($| )', 'i'),
    module: module, handler: handler, formatter: formatter
  });
};

Channel.prototype.registerEvent = function (event, module, handler, formatter) {
  // Only allow certain events to be binded to.
  var chan = this, whitelist = ['join', 'part', '+mode', '-mode'];
  if (whitelist.indexOf(event) == -1) {
    console.log('Module tried to bind unsafe event:', event); return;
  }
  this.network.on(event, function () {
    handler.call(module, arguments, function (out) {
      chan.network.say(chan.name, formatter(out));
    });
  });
};

Channel.prototype.say = function (msg) {
  this.network.say(this.name, this.config.colors ?
    msg : msg.replace(/[\x02\x1f\x16\x0f]|\x03\d{0,2}(?:,\d{0,2})?/g, ''));
};

module.exports = Channel;