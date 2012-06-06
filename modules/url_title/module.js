var request = require('request')
  , format = require('util').format;

var handlers = (function () {
  var h = {};

  //** TWITTER **//
  h['https?://twitter.com/(.+?)/status(es)?/(.+?)($| )'] = {
    handler: function (results, cb) {
      if (!results) { return; }
      var id = results[3];

      request('http://api.twitter.com/1/statuses/show/' + id + '.json', function (err, res, body) {
        if (err || res.statusCode != 200) { return; }
        var data = JSON.parse(body);
        cb({
          text: data['text'],
          user: data['user']['screen_name'],
          name: data['user']['name']
        });
      });
    },
    formatter: function (i) { return format('Tweet by %s (@%s): %s', i.name, i.user, i.text); }
  }

  //** YOUTUBE **//
  h['(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/'
  + '|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})'] = require('./youtube');

  return h;
}) ();

function URLTitle(io, config) {
  this.io = io;
  this.config = config;
  Object.keys(handlers).forEach(this.setupHandler, this);
}

URLTitle.prototype.setupHandler = function (regexp) {
  var title = handlers[regexp];

  // Add route to channel.
  this.io.route( new RegExp(regexp, 'gi'), this, function (info, cb) {
    var results = new RegExp(regexp).exec(info.message);
    title.handler(results, cb);
  }, title.formatter);
};

module.exports = URLTitle;