'use strict';

var request = require('request')
  , format = require('util').format;

var Wiki = {
         name: 'Wiki',
  description: 'searches information from Wikipedia',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.1'
};

function search(info, cb) {
  var q = info.message.split(' ').splice(1).join(' ')
    , api = 'http://en.wikipedia.org/w/api.php?action=query&list=search'
          + '&format=json&srprop=snippet&srlimit=10&srsearch=';

  request({
    url: api + fixedEncodeURIComponent(q),
    headers: {'User-Agent': 'tuhBot IRC-bot by tuhoojabotti'}
  }, function (err, res, data) {
    if (err) { cb(); return; }
    try { cb(JSON.parse(data)); }
    catch (err) { cb(); }
  });
}

function formatter(i) {
  if (!i) { return 'Something went wrong!'; }
  if (!i.query) { return 'Couldn\'t find what you wanted.'; }
  var suggestion = i.query.searchinfo.suggestion || ''
    , results = i.query.search
    , url = 'http://en.wikipedia.org/wiki/';

    // Filter bad results.
    results = results.filter(function (result) {
      var bars = (result.snippet.match(/\|/g) || []).length;
      if (bars > 3) { return false; }
      return true;
    });

  if (results.length) {
    var title = results[0].title
      , url = url + fixedEncodeURIComponent(title)
      , snippet = results[0].snippet     // Commence ugly regex clean up:
        .replace(/ +([.:,;])/g, '$1')    // " ." -> "." and so on.
        .replace(/<.+?>|\.{2,}/g, '')    // Delete HTML and multiple dots.
        .replace(/&nbsp;| {2,}/gi, ' ')  // Remove excess spaces.
        .trim().replace(/\.$/, '')       // Remove trailing dot.
        .replace(/([(\[{]) *(.+?) *([}\])])/g, '$1$2$3'); // Remove spaces before brackets.

    if (suggestion == title.toLowerCase()) { suggestion = ''; }
    suggestion = suggestion ? ' [or maybe ' + suggestion + ']' : '';

    return format('%s… %s%s', snippet, url, suggestion);
  } else if (suggestion) {
    return format('Could not find anything. Did you mean %s?', suggestion);
  } else {
    return 'Couldn\'t find what you wanted.';
  }
}

function fixedEncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}

Wiki.commands = {
  'wiki': {
      command: 'wiki',
           op: false,
         help: 'Searches Wikipedia for a tidbit.',
         args: [{name: 'query', description: 'search query'}],
      handler: search,
    formatter: formatter
  }
}


module.exports = Wiki;