'use strict';

var request = require('request')
  , format = require('util').format
  , c = require('irc').colors.wrap;

function handler(matches, cb) {
  request('https://graph.facebook.com/' + matches[1],
    function (err, res, body) {
      if (err) { log.exception(e, 'Request failed.'); }
      var data = JSON.parse(body);
      if (data === false) { cb('private'); return; }
      if (data.error) {
        if (data.error.code === 104) { cb('private'); }
        else { log.debug('Facebook api fail', data); }
      } else { cb(data); }
    }
  );
}

function formatter(i) {
  if (i === 'private') { return 'Facebook: [Private]'; };
  var likes = typeof i.likes === 'number' ?
        String(i.likes).replace(/(\d)(?=(\d{3})+$)/g, '$1,') : ''
    , about = i.about ? ' - ' + i.about : ''
    , category = i.category ? ' (' + i.category + ')' : ''
    , name = i.name || (i.from && i.from.name)
    , pic = (i.width && i.height) ? i.width + 'x' + i.height : '';

  if (likes) {
    return format('Facebook: %s%s%s [%s likes]', name, about, category, likes);
  } else if (i.gender) {
    return format('Facebook: %s%s%s [gender %s]', name, about, category, i.gender);
  } else if (pic) {
    return format('Facebook: image by %s [%s]', name, pic);
  } else { // Let's hope we've got something. :D
    return format('Facebook: %s%s%s', name, about, category);
  }
}


module.exports = {
  route: /facebook\.com\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:photo\.php\?fbid=)?(?:[\w\-]*\/)*([\w\-]*)/i,
  help: 'A route for Facebook urls.',
  handler: handler,
  formatter: formatter
};
