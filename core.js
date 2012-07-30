'use strict';

var fs = require('fs')
  , cp = require('child_process')
  , colors = require('colors')
  , Channel = require('./channel')
  , util = require('util')
  , _ = require('underscore')
  , readline = require('readline')
  , log = require('./log');

function Core() {
  this.networks = {};
  this.log = new log('Core', __dirname + '/core.log');
  this.channel = new CoreChannel(this);

  this.loadNetworks();
}
util.inherits(Core, process.EventEmitter);

Core.prototype.loadNetworks = function () {
  var networks = fs.readdirSync(__dirname + '/irc');
  networks.forEach(this.initNetwork, this);
};

Core.prototype.initNetwork = function (id) {
  var core = this;
  core.networks[id] = cp.fork(__dirname + '/network.js', [id], {'cwd': __dirname + '/irc/' + id});
  core.networks[id].on('message', function (msg) {
    core.networkMessage(id, msg);
  });
};

Core.prototype.networkMessage = function (network, msg) {
  var core = this, ircEvents = ['registered', 'names', 'topic', 'join', 'part', 'quit', 'kick',
   'kill', 'notice', 'pm', 'nick', 'invite', '+mode', '-mode', 'whois'], a;

  // Forward the event to our special CoreChannel
  if (ircEvents.indexOf(msg.type) !== -1) {
    a = _.values(msg.args);
    a.unshift(msg.type, network);  // We have to know what network we got the event from.
    this.emit.apply(this, a);
  }

  if (msg.type == 'message' || msg.type == 'message#') {
    core.log.msg(network, msg);
    var reply = function reply(message) {
      core.say(network, msg.args[1], message);
    }
    this.channel.handleMessage.call(this.channel,
      {net: network, from: msg.args[0], channel: msg.args[1], text: msg.args[2], raw: msg.args[3],
       reply: reply});
  }
};

Core.prototype.exit = function (message) {
  var core = this;
  // Tell all networks to disconnect and terminate.
  Object.keys(core.networks).forEach(function (net) {
    core.networks[net].once('exit', function() {
      core.exitCallback(net);
    });
    core.networks[net].send({
      type: 'exit',
      message: (message || core.channel.config.quitMessage || "http://git.io/tuhbot")
    });
  });
}

Core.prototype.exitCallback = function (networkId) {
  delete this.networks[networkId];
  if (Object.keys(this.networks).length < 1) {
    process.exit();
  }
}

Core.prototype.say = function (net, to, msg) {
  // Tell network to send a message
  this.networks[net].send({type: 'message', to: to, text: msg});
};


function CoreChannel(core) {
  Channel.call(this, core, 'core');

  this.io = {
    send: function (net, args) {
      core.networks[net].send({type: 'command', args: args}); },
    core: this.network,
    channel: this
  };

  this.allowedEvents = ['join', 'part', '+mode', '-mode', 'invite'];
  this.modulePath = __dirname + '/modules/core/';
  this.isCore = true;
  this.init();
}
util.inherits(CoreChannel, Channel);

// Create a new bot.
var bot = new Core();

process.on('uncaughtException', function (err) {
  console.error('Process caught an uncaught exception!'.red);
  console.error(err.stack);
  //bot.log.exception(err);
});

var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
var sigintsReceived = 0;
rl.on('SIGINT', function () {
  sigintsReceived++;
  console.log('Core received SIGINT'.yellow);
  if (sigintsReceived === 1) {
    bot.exit();
  } else if (sigintsReceived === 2) {
    console.log('Core is already shutting down!'.red, 'If you want to force exit, send SIGINT again.');
  } else {
    process.exit(1);
  }
});
