'use strict';

var request = require('request')
  , format = require('util').format;

var Wiki = {
         name: 'Wiki',
  description: 'searches information from Wikipedia',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '1.1'
};

function search(info, cb) {
  console.dir(info.args);
  var q = info.args || []
    , nugget = q[0] == 'nugget' ? q.splice(0, 1)[0] == 'nugget' : false
    , lang = q[0] && q[0].length == 2 ? q.splice(0, 1)[0] : 'en'
    , api = 'http://' + lang + '.wikipedia.org/w/api.php?action=query&list=search'
          + '&format=json&srprop=snippet&srlimit=10&srsearch=';

  if (nugget) {
    request('http://dykapi.appspot.com/api/?format=json',
    function (err, res, data) {
      if (err) { cb(); return; }
      try { cb({ type: 'nugget', data: JSON.parse(data).response}); }
      catch (err) { cb(); }});
  } else {
    request({url: api + escape(q.join(' ')),
      headers: {'User-Agent': 'tuhBot IRC-bot by tuhoojabotti'}
    }, function (err, res, data) {
      if (err) { cb(); return; }
      try { cb({ type: 'wiki', lang: lang, data: JSON.parse(data)}); }
      catch (err) { cb(); }});
  }
}

function formatter(i) {
  if (!i) { return 'Something went wrong!'; }
  if (i.type == 'wiki') {
    if (!i.data.query) { return 'Couldn\'t find what you wanted.'; }
    var suggestion = i.data.query.searchinfo.suggestion || ''
      , results = i.data.query.search, url = 'http://' + i.lang + '.wikipedia.org/wiki/';

      results = results.filter(function (result) {
        var bars = (result.snippet.match(/\|/g) || []).length;
        if (bars > 3) { return false; }
        return true;
      });

    if (results.length) {
      var title = results[0].title, url = url + escape(title)
        , snippet = clean(results[0].snippet);

      if (!suggestion || suggestion == title.toLowerCase()) { suggestion = '';}
      else { suggestion = ' [or maybe ' + suggestion + ']'; }

      return format('%s… %s%s', snippet, url, suggestion);

    } else if (suggestion) { return format("Could'nt find anything, did you mean %s?", suggestion);
    } else                 { return "Couldn't find what you wanted."; }

  } else if (i.type == 'nugget') {
    return format('Did you know %s.', clean(i.data[0].hook.text));
  }
}

function clean(str) {
  return str                         // Commence ugly regex clean up:
    .replace(/ +([.:,;]|'s)/g, '$1') // " ." -> "." and so on.
    .replace(/<.+?>|\.{2,}/g, '')    // Delete HTML and multiple dots.
    .replace(/&nbsp;| {2,}/gi, ' ')  // Remove excess spaces.
    .trim().replace(/\.$/, '')       // Remove trailing dot.
    .replace(/([(\[{]) *(.+?) *([}\])])/g, '$1$2$3'); // Remove spaces before brackets.
}

Wiki.commands = {
  'wiki': {
      command: 'wiki',
           op: false,
         help: 'Searches Wikipedia for a tidbit.',
         args: [{name: 'nugget or query', description: '"nugget" for did you know'},
                {name: 'language', description: 'language to use (for query)', default: 'en'}],
      handler: search,
    formatter: formatter
  }
}


module.exports = Wiki;