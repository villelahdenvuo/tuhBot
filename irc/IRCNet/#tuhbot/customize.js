var util = require('util')
  , c = require('irc').colors.wrap
  , moment = require('moment');
var modulePath = '../../../modules/'

// Override Test module.
var Test = require(modulePath + 'test/module');

// Override testFormatter for this channel.
Test.commands.test.formatter = function (i, o) {
  return '"' + i.prefix + i.message + '"';
};

// Override URLTitle for this channel
var URLTitle = require(modulePath + 'url_title/module');

var oldInit = URLTitle.init;
URLTitle.init = function () {
  oldInit.call(this);
  var reddit = this.context.handlers.reddit;
  reddit.formatter = function formatter(i) {
    var nsfw = i.over_18 ? c('light_red', ' K-18') : ''
      , url = i.is_self ? '' : i.short_url + ' '; // Show link to content if not self post.

    return util.format('Reddit: %s%s %s: %s [%s karma - %s comments%s]',
      url, moment(i.created_utc * 1000).fromNow(), c('gray', i.author), i.title,
      c('yellow', i.score), c('yellow', i.num_comments), nsfw);
  }
}

module.exports = {
  'test': Test,
  'url_title': URLTitle
};
