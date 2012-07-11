'use strict';

var request = require('request')
  , format = require('util').format
  , c = require('irc').colors.wrap;

function handler(matches, cb) {
  request('http://api.twitter.com/1/statuses/show/' + matches[2] + '.json',
    function (err, res, body) {
      if (err || res.statusCode != 200) { return; }
      var data = JSON.parse(body);
      cb({
        text: data['text'],
        user: data['user']['screen_name'],
        name: data['user']['name']
      });
    }
  );
}

function formatter(i) {
  return format('Tweet: %s (%s): %s',
    i.name, c('light_green', '@' + i.user), i.text);
}


module.exports = {
  route: /twitter\.com\/\w+\/status(es)?\/(\d+)/,
  help: 'A route for tweet urls.',
  handler: handler,
  formatter: formatter
};
