'use strict';

var RSSReader = require('./rss')
  , moment = require('moment')
  , format = require('util').format
  , shorten = require('../../common/shorturl');

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

var RSS = {
         name: 'RSS',
  description: 'spams RSS to channel',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.7',
         init: initRSS,
       uninit: uninitRSS
};

function initRSS() {
  var context = this.context;
  this.intervals = {};
  context.feeds = {};
  context.config.feeds.forEach(initFeed, this);
}

function initFeed(conf) {
  this.context.log.debug('Starting feed', conf);
  var feed = this.context.feeds[conf.name] = {conf: conf};
  var reader = feed.reader = new RSSReader(conf.url, conf.updateInterval * 1000);

  function formatArticle(a) {
    return format('%s%s %s',
     conf.prefix, a.title, a.link);
  }

  this.intervals[conf.name] = {
    name: conf.name,
    interval: conf.spamInterval * 1000,
    help: 'Spams RSS data',
    handler: function (o) {
      var a = reader.getArticle();
      if (!a) { return; }
      shorten(a.link, function (err, url) {
        if (err) { return; }
        a.link = url;
        o(a);
      });
    },
    formatter: formatArticle
  };
}

function uninitRSS() {
  each(this.context.feeds, function (name, feed) {
    this.context.log.debug('Stopping feed', feed.conf);
    console.log('Stopping feed', name);
    feed.reader.stop();
    delete this.context.feeds[name];
  }, this);
}

function rss_command(info, cb) {
  switch(info.args[0]) {
    case 'help':
      cb(RSS.getHelp(info.args[1]));
    break;
    case 'ls':
      cb({cmd: 'ls', feeds: this.feeds});
    break;
    case 'stop':
      var feed = this.feeds[info.args[1]];
      if (feed) {
        this.log.debug('Stopping feed', feed.conf);
        if (feed.reader.stop()){
          cb('Feed stopped.');
        } else {
          cb('Feed already stopped.');
        }
      } else { cb('Feed not found.'); }
    break;
    case 'start':
      var feed = this.feeds[info.args[1]];
      if (feed) {
        this.log.debug('Stopping feed', feed.conf);
        if (feed.reader.start()) {
          cb('Feed started.');
        } else {
          cb('Feed already started.');
        }
      } else { cb('Feed not found.'); }
    break;
    default:
      cb('Invalid action.');
  }
}

// Allow overriding this function.
RSS.getHelp = function (command) {
  var ret = '';
  switch(command) {
    case 'ls':
      ret = 'Lists all feeds on this channel: "name: url (updateInterval, spamInterval)"';
    break;
    case 'start':
      ret = 'Starts the feed.';
    break;
    case 'stop':
      ret = 'Stops the feed.';
    break;
    case 'help': ret = 'Get help about actions.\n';
    default: ret += 'Available actions: help, ls, rm, add, start, stop';
  }
  return ret;
};

function rss_formatter(i) {
  if (typeof i === 'string') { return i; }

  switch(i.cmd) {
    case 'ls':
      return Object.keys(i.feeds).map(function (name) {
        var f = i.feeds[name].conf
          , running = i.feeds[name].reader.running ? 'running' : 'stopped';
        return format('%s (%s): %s (%d, %d)',
          f.name, running, f.url, f.updateInterval, f.spamInterval);
      }).join('\n');
    break;
  }
}

RSS.commands = {
  'rss': {
           op: true,
         help: '',
         args: [{name: 'action', description: 'what to do: ls/rm/add/stop/start', default: 'help'},
                {name: 'feed', description: 'which feed to apply action on', default: '<feed name>'}],
      handler: rss_command,
    formatter: rss_formatter
  }
};


module.exports = RSS;