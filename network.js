'use strict';

var colors = require('colors')
  , async = require('async')
  , util = require('util')
  , irc = require('irc').Client
  , fs = require('fs');

var Channel = require('./channel');


function Network(name) {
  this.channelHandles = {};
  this.config = {};
  this.name = name;

  console.log('%s process starting up...', name.green);
  this.loadConfig();
  this.loadChannels();
  this.bindEvents();
  this.startClient();
  this.listenMaster();
  this.forwardEvents();
}
util.inherits(Network, irc);

Network.prototype.loadConfig = function () {
  this.config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json'));
};

Network.prototype.loadChannels = function () {
  var channels = fs.readdirSync(process.cwd());
  // Filter to only contain items starting with a valid channel prefix.
  channels = channels.filter(function (c) { if ('!#+&'.indexOf(c[0]) !== -1) { return c; } });
  this.channels = channels;
};

Network.prototype.startClient = function () {
  var c = this.config;
  // Create an irc client
  irc.call(this, c.address, c.nick, {
    userName: c.userName,
    realName: c.realName,
    floodProtection: c.floodProtection,
    autoRejoin: c.autoRejoin,
    channels: this.channels
  });
  this.nick = c.nick;
};

Network.prototype.bindEvents = function () {
  function onRegistered() {
    console.log('%s connected to server. :O)', this.name.green);
  }

  function onJoin(ch, nick, msg) {
    if (nick === this.nick) {
      console.log('%s joined channel %s.', this.name.green, ch.green);
      this.initChannel(ch.toLowerCase());
    } else { console.log('User %s joined channel %s.', nick.green, ch.green); }
  }

  function onNames(ch, nicks) {
    console.log('%s names (%s): %s',
      this.name.green, ch.green, Object.keys(nicks).join(', '.magenta));
  }

  function onPart(ch, nick, reason, message) {
    if (nick === this.nick) {
      console.log('Parted %s.', ch);
      this.unloadChannel(ch.toLowerCase());
    }
  }

  this.on('registered', onRegistered);
  this.on('join', onJoin);
  this.on('names', onNames);
  this.on('part', onPart);
};

Network.prototype.forwardEvents = function () {
  var network = this;
  ['registered', 'names', 'topic', 'join', 'part', 'quit', 'kick', 'kill', 'message#',
   'notice', 'pm', 'nick', 'invite', '+mode', '-mode', 'whois', 'error']
  .forEach(function (event) {
    network.on(event, function forwardEvent() {
      if (process.send) { process.send({type: event, args: arguments}); }
    });
  });
};

Network.prototype.listenMaster = function (msg) {
  var net = this;

  function onMessage(msg) {
    if (msg.type === 'command') {
      net.send.apply(net, msg.args);
    }
  }
  process.on('message', onMessage);
}

Network.prototype.initChannel = function (name) {
  console.log('Joined', name);
  var net = this, channel = this.channelHandles[name] = new Channel(this, name);
  channel.init();

  function reply(msg) {
    net.say(name, channel.config.colors ?
      msg : msg.replace(/[\x02\x1f\x16\x0f]|\x03\d{0,2}(?:,\d{0,2})?/g, ''));
  }

  this.on('message' + name, function (from, message, raw) {
    channel.handleMessage.call(channel, {from: from, text: message, raw: raw, reply: reply});
  });
};

Network.prototype.unloadChannel = function (name) {

}

process.on('uncaughtException', function (err) {
  console.error('%s Network (%s) catched error at the last minute!', 'ERROR'.red, process.argv[2]);
  console.log(err.stack);
});

var network = new Network(process.argv[2]);

process.stdin.resume();
process.on('SIGINT', function () {
  console.log('%s received SIGINT', network.name.green);

  network.disconnect('Interrupted! ;O', function () {
    console.log('We have now quit from', network.name.green);
    process.exit();
  });
});

// Process will be signaled with SIGURS1 when core decides to exit.
process.on('SIGUSR1', function () {
  console.log('%s received SIGUSR1', network.name.green);

  network.disconnect('Going down, c\'ya!', function () {
    console.log('We have now quit from', network.name.green);
    process.exit();
  });
});
