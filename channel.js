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

Channel.prototype.initModule = function (module, config) {
  console.log('Loading module', module.green, config);
  if (this.overrides[module]) {
    this.modules[module] = new this.overrides[module](this, config);
  } else {
    this.modules[module] =
      new (require(__dirname + '/modules/' + module + '/module'))(this, config);
  }
};

Channel.prototype.handleMessage = function (from, message) {
  var chan = this;
  this.routes.forEach(function (route) {
    if (!route.route.test(message)) { return };
    route.handler.call(route.module, {from: from, message: message}, function (out) {
      chan.say(route.formatter(out));
    });
  }, this);
};

Channel.prototype.route = function (route, module, handler, formatter) {
  this.routes.push({route: route, module: module, handler: handler, formatter: formatter});
};

Channel.prototype.command = function (command, module, handler, formatter) {
  this.routes.push({
    route: new RegExp('^' + this.config.commandPrefix + command, 'i'),
    module: module, handler: handler, formatter: formatter
  });
};

Channel.prototype.say = function (msg) {
  this.network.say(this.name, msg);
};

module.exports = Channel;