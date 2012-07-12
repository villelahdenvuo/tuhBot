'use strict';

var fs = require('fs')
  , cp = require('child_process')
  , colors = require('colors')
  , Channel = require('./channel')
  , util = require('util')
  , _ = require('underscore')
  , readline = require('readline');

function Core() {
  this.networks = {};

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
    var reply = function reply(message) {
      core.say(network, msg.args[1], message);
    }
    this.channel.handleMessage.call(this.channel,
      {net: network, from: msg.args[0], channel: msg.args[1], text: msg.args[2], raw: msg.args[3],
       reply: reply});
  }
};

Core.prototype.exit = function (signal) {
  var core = this;
  // Tell all networks to disconnect and terminate.
  Object.keys(core.networks).forEach(function (net) {
    core.networks[net].send({type: 'exit', message: (core.channel.config.quitMessage || "http://git.io/tuhbot")});
  });
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
  this.modulePath = __dirname + '/core/modules/';
  this.isCore = true;
  this.init();
}
util.inherits(CoreChannel, Channel);

process.on('uncaughtException', function (err) {
  console.error('%s Core catched error at the very last minute!', 'ERROR'.red);
  console.log(err.stack);
});

// Create a new bot.
var bot = new Core();

function exit() {
  console.log('Core received SIGINT');
  bot.exit();
  process.exit();
}

var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('SIGINT', exit);

