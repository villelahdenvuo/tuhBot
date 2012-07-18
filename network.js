'use strict';

var colors = require('colors')
  , async = require('async')
  , util = require('util')
  , irc = require('irc').Client
  , log = require('./log')
  , fs = require('fs');

var Channel = require('./channel');

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

function Network(name) {
  this.channelHandles = {};
  this.config = {};
  this.name = name;

  console.log('%s process starting up...', name.green);
  this.log = new log(name, process.cwd() + '/network.log');
  this.loadConfig();
  this.loadChannels();
  this.bindEvents();
  this.startClient();
  this.listenMaster();
  this.forwardEvents();
}
util.inherits(Network, irc);

Network.prototype.loadConfig = function () {
  try {
    this.config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json'));
  } catch(e) {
    console.error(this.name.red, 'Failed to load config.');
    this.log.exception(e, 'Network ' + name + ' failed to load config.');
  }
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
      this.clearChannel(ch.toLowerCase());
    }
  }

  function onKick(ch, nick, by, reason, message) {
    if (nick === this.nick) {
      console.log('Kicked from %s.', ch);
      this.clearChannel(ch.toLowerCase());
    }
  }

  this.on('registered', onRegistered);
  this.on('join', onJoin);
  this.on('names', onNames);
  this.on('part', onPart);
  this.on('kick', onKick);
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
    switch(msg.type) {
      case 'command':
        net.send.apply(net, msg.args); break;
      case 'message':
        net.say(msg.to, msg.text); break;
      case 'rehash':
        each(net.channelHandles, function (n, ch) { console.log('hashing', n); ch.rehash(msg.silent); }); break;
      case 'exit':
        console.log('Exiting from', net.name.green);
        net.disconnect(msg.message, function () {
          console.log('Shutting down connection to', net.name.green);
          process.exit();
        });
        setTimeout(process.exit, 5000);
        break;
    }
  }
  process.on('message', onMessage);
}

Network.prototype.initChannel = function (name) {
  var net = this, channel = net.channelHandles[name] = new Channel(net, name);
  if (!channel.init()) {
    this.log.warning('Initializing of channel ' + name + ' failed.')
    delete net.channelHandles[name];
    return;
  }

  function reply(msg) {
    net.say(name, channel.config.colors ?
      msg : msg.replace(/[\x02\x1f\x16\x0f]|\x03\d{0,2}(?:,\d{0,2})?/g, ''));
  }

  channel.listener = function (from, message, raw) {
    channel.handleMessage.call(channel,
      {from: from, text: message, raw: raw, reply: reply});
  };

  net.on('message' + name, channel.listener);
};

Network.prototype.clearChannel = function (name) {
  name = name.toLowerCase();
  var channel = this.channelHandles[name];
  this.removeListener('message' + name, channel.listener);
  channel.clear();
  channel = undefined;
  delete this.channelHandles[name];
}

process.on('uncaughtException', function (err) {
  console.error('%s Network (%s) catched error at the last minute!', 'ERROR'.red, process.argv[2]);
  console.log(err.stack);
});

var network = new Network(process.argv[2]);
