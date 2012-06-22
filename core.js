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
    //console.log(a);
    this.emit.apply(this, a);
  }

  if (msg.type == 'message' || msg.type == 'message#') {
    this.channel.handleMessage.call(this.channel, network, msg.args[0], msg.args[2], msg.args[3]);
  }

};

Core.prototype.kill = function (signal) {
  //_.each(this.networks, function (child, net) {
    //console.log('Telling %s to disconnect...', net);
    //child.kill(signal);
    //child.send({type: 'command', action: 'disconnect'});
  //});
  //console.log("I'm out!");
  //process.exit(signal);
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

CoreChannel.prototype.registerEvent = function (event, module, handler, formatter) {
  // Only allow certain events to be binded to.
  var chan = this, whitelist = ['join', 'part', '+mode', '-mode'];
  if (whitelist.indexOf(event) === -1) {
    console.log(module, 'tried to bind unsafe event:', event); return;
  }
  this.network.on(event, function () {
    var args = Array.prototype.slice.call(arguments)
      , net = args[0] // We injected the network as the first argument.

    args.splice(0, 1);

    console.log(args);
    process.exit();

    handler.call(module, args, function (out) {
      chan.network.say(net, chan.name, formatter(out));
    });
  });
};

CoreChannel.prototype.handleMessage = function (network, from, message, raw) {
  var chan = this, commands = this.commands, routes = this.routes;

  function handleRoute(r) {
    r.handler.call(r.module, {from: from, message: message, hostmask: raw.prefix}, function (out) {
      try { chan.network.say(net, from, r.formatter(out)); }
      catch (err) {
        console.error('%s Module %s formatter failed!', 'ERROR'.red, r.module);
        console.log(err.stack);
      }
    });
  }

  //console.log('CORE MESSAGE', network, from, message, commands);

  // Search for commands.
  for (var i in commands) { var r = commands[i];
    if (r.route.test(message)) { handleRoute(r); return; };
  }

  // It was not a command, let's see if we have routes for it.
  routes.forEach(function (r) {
    if (r.route.test(message)) { handleRoute(r); };
  });
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


