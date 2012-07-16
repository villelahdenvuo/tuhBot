'use strict';

var request = require('request')
  , format = require('util').format
  , c = require('irc').colors.wrap
  , async = require('async');


function normalizeUrls(text, cb) {
  var links = text.match(new RegExp('(https?://t\.co/\\w+)', 'g'));
  if (!links) { cb(text); }

  function normalizeSingleUrl(url, done) {
    request({url: url, followRedirect: false, method: 'HEAD', timeout: 1500}, function (err, res) {
      var resolvedUrl = res.headers['location'];

      if (resolvedUrl.length < url.length + 10) {
        text = text.replace(url, resolvedUrl);
      }
      done();
    });
  }

  async.forEach(links, normalizeSingleUrl, function (err) {
    cb(text);
  });
}

function handler(matches, cb) {
  request('http://api.twitter.com/1/statuses/show/' + matches[1] + '.json',
    function (err, res, body) {
      if (err || res.statusCode != 200) { return; }
      var data = JSON.parse(body);
      normalizeUrls(data.text, function (text) {
        cb({
          text: text,
          user: data.user.screen_name,
          name: data.user.name
        });
      });
    }
  );
}

function formatter(i) {
  return format('Tweet: %s (%s): %s',
    i.name, c('light_green', '@' + i.user), i.text);
}


module.exports = {
  route: /twitter\.com\/\w+\/status(?:es)?\/(\d+)/,
  help: 'A route for tweet urls.',
  handler: handler,
  formatter: formatter
};
