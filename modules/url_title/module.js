'use strict';

var handlers = {
  //** TWITTER **//
  'twitter\.com/\\w+/status(es)?/(\\d+)':
  require('./twitter'),
  //** YOUTUBE **//
  '(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})':
  require('./youtube'),
  //** REDDIT **//
  '(reddit\.com/r/\\w+/comments|redd\.it)/(\\w+)':
  require('./reddit')
};

function URLTitle(io, config) {
  this.io = io;
  this.config = config;
  Object.keys(handlers).forEach(this.setupHandler, this);
}


URLTitle.prototype.toString = function () {
  return '[module URLTitle]';
};

URLTitle.prototype.setupHandler = function (regexp) {
  var title = handlers[regexp], config = this.config, re = new RegExp(regexp, 'gi');

  // Add route to channel.
  this.io.route(re, this, function (info, cb) {
    title.handler(info.message.match(new RegExp(regexp)), cb); // FIXME: Closure problem.
  }, title.formatter);
};

module.exports = URLTitle;