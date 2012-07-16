'use strict';

var RSSReader = require('./rss')
  , moment = require('moment')
  , format = require('util').format
  , shorten = require('../shorturl');

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

var RSS = {
         name: 'RSS',
  description: 'spams RSS to channel',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.5',
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
  var feed = this.context.feeds[conf.name] = new RSSReader(conf.url, conf.updateInterval * 1000);

  function formatArticle(a) {
    return format('%s%s %s',
     conf.prefix, a.title, a.link);
  }

  this.intervals[conf.name] = {
         name: conf.name,
     interval: conf.spamInterval * 1000,
         help: 'Spams RSS data',
      handler: function (o) {
        var a = feed.getArticle();
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
  each(this.context.feeds, function (name, feed) { console.log('Stopping feed', name); feed.stop(); });
}

function rss_command(info, cb) {

}

RSS.commands = {
  /*'rss': {

  }*/
};


module.exports = RSS;