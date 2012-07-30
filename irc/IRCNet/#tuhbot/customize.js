var util = require('util')
  , c = require('irc').colors.wrap
  , moment = require('moment');
var modulePath = '../../../modules/'

// Override Test module.
var Test = require(modulePath + 'channel/test/module');

// Override testFormatter for this channel.
Test.commands.test.formatter = function (i, o) {
  return '"' + i.prefix + i.message + '"';
};

// Override URLTitle for this channel
var URLTitle = require(modulePath + 'channel/url_title/module');

var oldInit = URLTitle.init;
URLTitle.init = function () {
  oldInit.call(this);
  var reddit = this.context.handlers.reddit
    , oldFormatter = reddit.formatter;

  reddit.formatter = function formatter(i) {
    return oldFormatter.call(this, i).replace(/NSFW/, 'K-18');
  }
}

module.exports = {
  'test': Test,
  'url_title': URLTitle
};
