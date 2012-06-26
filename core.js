'use strict';

var argv = require('optimist')
    .default({d: false})
    .alias({'d': 'debug', 'h': 'help'})
    .describe({'d': 'Spam a lot.'})
    .usage('Run bot: $0')
    .check(function (a) { return !a.h; })
    .argv;

var fs = require('fs')
  , cp = require('child_process')
  , colors = require('colors')
  , Channel = require('./channel')
  , util = require('util')
  , _ = require('underscore');

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
  var ircEvents = ['registered', 'names', 'topic', 'join', 'part', 'quit', 'kick', 'kill',
    'notice', 'pm', 'nick', 'invite', '+mode', '-mode', 'whois'], a;

  // Forward the event to our special CoreChannel
  if (ircEvents.indexOf(msg.type) != -1) {
    a = _.values(msg.args);
    a.unshift(msg.type, network);  // We have to know what network we got the event from.
    this.emit.apply(this, a);
  }

  if (msg.type == 'message' || msg.type == 'message#') {
    this.channel.handleMessage.call(this.channel, network, msg.args[0], msg.args[2], msg.args[3]);
  }

};

Core.prototype.exit = function (signal) {
  var core = this;
  // Tell all networks to disconnect and terminate.
  Object.keys(core.networks).forEach(function (net) {
    core.networks[net].kill('SIGUSR1');
  });
  process.stdin.pause(); // Quit listening to input.
}

Core.prototype.say = function (net, to, msg) {
  // Tell network to send a message
  this.networks[net].send({type: 'message', to: to, message: msg});
};

function CoreChannel(core) {
  Channel.call(this, core, 'core');

  this.modulePath = __dirname + '/core/modules/';
  this.init();
}
util.inherits(CoreChannel, Channel);

// Overwrite methods using network, because we don't know the network.

CoreChannel.prototype.registerEvent = function registerEvent(module, name, event) {
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
  if (['join', 'part', '+mode', '-mode', 'invite'].indexOf(name) === -1) {
    console.log('Module tried to bind unsafe event:', name.red); return;
  }

  chan.network.on(name, function () {
    var args = Array.prototype.slice.call(arguments)
      , net = args[0]     // We injected the network as the first argument.

    handler.call(module, args, function (out) {
      chan.network.say(net, chan.name, event.formatter(out));
    })
  });
}

CoreChannel.prototype.handleMessage = function (network, from, message, raw) {
  var chan = this, commands = this.commands, routes = this.routes;

  function handleRoute(r) {
    r.handler.call(r.module,
      { from: from
      , message: message
      , hostmask: raw.prefix
      , args: message.split(' ').splice(1) },
      function (out) {
        try { chan.network.say(net, from, r.formatter(out)); }
        catch (err) {
          console.error('%s Module %s formatter failed!', 'ERROR'.red, r.module);
          console.log(err.stack);
        }
      }
    );
  }

  // Search for commands.
  for (var i in commands) { var r = commands[i];
    if (message.match(r.route)) { handleRoute(r); return; };
  }

  // It was not a command, let's see if we have routes for it.
  routes.forEach(function (r) {
    if (message.match(r.route)) { handleRoute(r); };
  });
};

CoreChannel.prototype.exposeIO = function () {
  var io = Channel.prototype.exposeIO.call(this)
    , core = this.network;

  // Expose more I/O methods.
  io['core'] = core;
  io['send'] = function (net, args) {
    core.networks[net].send({type: 'command', args: args});
  };

  return io;
};

process.on('uncaughtException', function (err) {
  console.error('%s Core catched error at the very last minute!', 'ERROR'.red);
  console.log(err.stack);
});

// Create a new bot.
var bot = new Core();

process.stdin.resume();
process.on('SIGINT', function () {
  console.log('Core received SIGINT');
  // Wait for child processes to die cleanly (or something).
  setTimeout(function () { process.exit(); }, 1000);
});