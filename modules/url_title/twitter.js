var request = require('request')
  , format = require('util').format
  , c = require('irc').colors.wrap;

function handler(results, cb) {
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
}

function formatter(i) {
  return format('Tweet by %s (%s): %s', i.name, c('light_green', '@' + i.user), i.text);
}



module.exports = {
  handler: handler,
  formatter: formatter
};