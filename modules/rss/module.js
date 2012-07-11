'use strict';

var rssee = require('rssee');

var RSS = {
         name: 'RSS',
  description: 'spams RSS to channel',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.1',
         init: initRSS
};

function initRSS() {
  var feeds = this.context.config.feeds;
  this.intervals = {};
  this.context.queue = {};
  this.context.feeds = {};
  feeds.forEach(initFeed, this);
}

function initFeed(conf) {
  var queue = this.context.queue[conf.name] = [];

  // Start checking
  var feed = this.context.feeds[conf.name] =
    rssee.create({interval:conf.interval, ignore_first_run: false});

  feed.on('article', function onArticle(a) {
    console.dir(a);
    console.log('got an article!');
    queue.push(a);
  })

  feed.start(conf.url);
  console.log('Started feed', feed)

  this.intervals[conf.name] = {
         name: conf.name,
     interval: conf.interval * 1000,
         help: 'Spams RSS data',
      handler: function (o) {
        var item = this.queue[conf.name].shift();
        if (item) { o(item) };
      },
    formatter: function (i) { console.dir(i); }
  };
}

function rss_command(info, cb) {

}

RSS.commands = {
  /*'rss': {

  }*/
};


module.exports = RSS;