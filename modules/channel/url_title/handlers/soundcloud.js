'use strict';

var request = require('request')
  , format = require('util').format
  , c = require('irc').colors.wrap;

function handler(matches, cb) {
  var log = this;
  request('http://api.soundcloud.com/resolve.json?url=' +
    escape(matches[0]) + '&client_id=' + this.config.handlers.soundcloud.client_id,
    function (err, res, body) {
      if (err) { log.exception(e, 'Request failed.'); }
      if (res.statusCode !== 200) { return; }
      var data = JSON.parse(body);
      if (data && data.errors) { log.debug('Soundcloud api fail', data); return; }
      if (data && data.kind === 'track') { cb(data); }
    }
  );
}

function formatter(i) {
  var d = secondsToTime(i.duration / 1000)
  , duration = (d.h ? d.h + 'h' : '')
             + (d.m ? d.m + 'm' : '')
             + (d.s ? d.s + 's' : '');
  var dl = i.downloadable ? ' DL' : ''
    , bpm = i.bpm ? ' ' + i.bpm + 'bpm' : ''
    , wip = i.track_type === 'in progress' ? c('yellow', ' WIP') : '';

  return format('Soundcloud: %s by %s [%s %s%s%s%s]',
    i.title, i.user.username, c('light_green', '+' + i.favoritings_count), duration, bpm, wip, dl);
}

function secondsToTime(secs) {
  var hours = Math.floor(secs / (60 * 60));

  var divisor_for_minutes = secs % (60 * 60);
  var minutes = Math.floor(divisor_for_minutes / 60);

  var divisor_for_seconds = divisor_for_minutes % 60;
  var seconds = Math.ceil(divisor_for_seconds);

  return {"h": hours, "m": minutes, "s": seconds};
}


module.exports = {
  route: /https:\/\/soundcloud\.com\/[^\/]+\/[^ \/]+/i,
  help: 'A route for Soundcloud urls.',
  handler: handler,
  formatter: formatter
};
