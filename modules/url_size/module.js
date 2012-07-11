'use strict';

var request = require('request')
  , async = require('async')
  , format = require('util').format
  , c = require('irc').colors.wrap;

function check(info, cb) {
  var size = this.config.warnSize * 1024 * 1024;
  if (!info.matches) { return; }
  request.head(info.matches[0], function (err, res, body) {
    if (!err && res.headers && res.headers['content-length'] > size) { cb(res.headers); }
  });
}

function warn(i) {
  var size = i['content-length'] / 1024 / 1024;
  return format('Warning - Size: %s - Type: %s',
    c('light_red', size.toFixed(1) + ' MB'), i['content-type']);
}

var URLSize = {
         name: 'URLSize',
  description: 'looks for links in messages and warns about big downloads',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.1',
};

URLSize.routes = {
  'url': {
        route: /(?:(?:https?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/i,
         help: 'a route to match any urls',
      handler: check,
    formatter: warn
  }
};


module.exports = URLSize;