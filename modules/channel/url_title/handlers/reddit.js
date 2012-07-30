'use strict';

var request = require('request')
  , format = require('util').format
  , c = require('irc').colors.wrap
  , moment = require('moment')
  , urly = require('../../../common/shorturl');

function handler(matches, cb) {
  request({
    url: 'http://www.reddit.com/by_id/t3_' + matches[2] + '.json',
    headers: {'User-Agent': 'tuhBot IRC-bot by /u/tuhoojabotti'}
  }, function (err, res, body) {
      if (err || res.statusCode !== 200) { return; }
      var data = JSON.parse(body).data.children[0].data;

      if (data) {
        if (data.url) {
          urly(data.url, function (err, url) {
            if (err) { cb(data); return; }
            data.short_url = url;
            cb(data);
          });
        } else {
          cb(data);
        }
      }
    }
  );
}

function formatter(i) {
  var nsfw = i.over_18 ? c('light_red', ' NSFW') : ''
    , url = i.is_self ? '' : i.short_url + ' '; // Show link to content if not self post.

  return format('Reddit: %s%s %s: %s [%s karma - %s comments%s]',
    url, moment(i.created_utc * 1000).fromNow(), c('gray', i.author), i.title,
    c('yellow', i.score), c('yellow', i.num_comments), nsfw);
}

module.exports = {
  route: /(reddit\.com\/r\/\w+\/comments|redd\.it)\/(\w+)/,
  help: 'A route for Reddit urls.',
  handler: handler,
  formatter: formatter
};