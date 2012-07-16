var request = require('request')
  , format = require('util').format
  , c = require('irc').colors.wrap;

function handler(matches, cb) {
  request('http://www.imdbapi.com/?i=' + matches[1],
    function (err, res, body) {
      if (err) { return; }
      var data = JSON.parse(body);
      if (data.Response === 'False') { return; }
      cb(data);
    }
  );
}

function formatter(i) {
  var r = parseFloat(i.imdbRating, 10)
    , color = r <= 5 ? 'light_red' :
              r <= 7.5 ? 'yellow' : 'light_green';

  return format('%s (%s) - %s [%s - %s/10]', c('gray', i.Title), i.Year,
    i.Plot, i.Runtime, c(color, r.toFixed(1)));
}

module.exports = {
  route: /imdb\.com\/title\/(tt\d+)/,
  help: 'A route for IMDb urls.',
  handler: handler,
  formatter: formatter
};