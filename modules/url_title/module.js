'use strict';

var handlers = {
  //** TWITTER **//
  'https?://twitter.com/\\w+/status(es)?/(\\d+)':
  require('./twitter'),
  //** YOUTUBE **//
  '(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})':
  require('./youtube')
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
  var title = handlers[regexp], config = this.config;

  // Add route to channel.
  this.io.route( new RegExp(regexp, 'gi'), this, function (info, cb) {
    title.handler(new RegExp(regexp).exec(info.message), cb);
  }, title.formatter);
};

module.exports = URLTitle;