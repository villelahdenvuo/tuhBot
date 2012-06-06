var fs = require('fs')
  , path = require('path');

function Channel(network, name) {
  this.network = network;
  this.name = name;
  this.config = {};
  this.routes = [];
  this.modules = {};
  this.overrides = {};

  this.loadConfig();
  this.loadOverrides();
  this.initModules();
}

Channel.prototype.loadConfig = function () {
  this.config = JSON.parse(fs.readFileSync(process.cwd() + '/' + this.name + '/config.json'));
};

Channel.prototype.loadOverrides = function () {
  if (path.existsSync(process.cwd() + '/' + this.name + '/customize.js')) {
    this.overrides = require(process.cwd() + '/' + this.name + '/customize');
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
  var chan = this, routes = this.routes;

  for (var i in routes) { var r = this.routes[i];
    if (routes.hasOwnProperty(r) || !r.route.test(message)) { continue; };
    // It's a match. Execute module handler and output message if needed.
    r.handler.call(r.module, {from: from, message: message}, function (out) {
      chan.say(r.formatter(out));
    });
    break; // Only one execution per message. Module that registered it's handler first wins.
  }
};

Channel.prototype.registerRoute = function (route, module, handler, formatter) {
  this.routes.push({route: route, module: module, handler: handler, formatter: formatter});
};

// A shorthand for routes for commands.
Channel.prototype.registerCommand = function (command, module, handler, formatter) {
  this.routes.push({
    route: new RegExp('^' + this.config.commandPrefix + command + '($| )', 'i'),
    module: module, handler: handler, formatter: formatter
  });
};

Channel.prototype.registerEvent = function (event, module, handler, formatter) {
  var chan = this, whitelist = ['join', 'part', '+mode', '-mode']; // Only allow certain events to be binded to.
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