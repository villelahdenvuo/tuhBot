'use strict';

var request = require('request')
  , format = require('util').format
  , c = require('irc').colors.wrap;

function handler(matches, cb) {
  console.log('https://graph.facebook.com/' + matches[1]);
  request('https://graph.facebook.com/' + matches[1],
    function (err, res, body) {
      if (err) { log.exception(e, 'Request failed.'); }
      var data = JSON.parse(body);
      if (!data) { return; };
      if (data.error) {
        if (data.error.code === 104) { cb('private'); }
        else { log.debug('Facebook api fail', data); }
      } else {
        cb(data);
      }
    }
  );
}

function formatter(i) {
  if (i === 'private') { return 'Facebook: [Private]'; };
  var likes = i.likes ? String(i.likes).replace(/(\d)(?=(\d{3})+$)/g, '$1,') : ''
    , about = i.about ? ' - ' + i.about : ''
    , category = i.category ? ' (' + i.category + ')' : '';

  if (likes) {
    return format('Facebook: %s%s%s [%s likes]',
      i.name, about, category, likes);
  } else if (i.gender) {
    return format('Facebook: %s%s%s [gender %s]',
      i.name, about, category, i.gender);
  } else {
    return format('Facebook: %s%s%s',
      i.name, about, category);
  }
}


module.exports = {
  route: /(?:http:\/\/)?(?:www.)?facebook.com\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:[\w\-]*\/)*([\w\-]*)/i,
  help: 'A route for Facebook urls.',
  handler: handler,
  formatter: formatter
};
