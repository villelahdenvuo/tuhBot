'use strict';

var request = require('request')
  , format = require('util').format
  , encoder = require('../encoder');

function handler(url, cb) {
  request(url,
    function (err, res, body) {
      if (err || res.statusCode !== 200 ||
        res.headers['content-type'].indexOf('text/html') === -1) { return; }

      if (body.length > 15) {
        var start = body.toLowerCase().indexOf('<title');
        if (start === -1) { return; }

        start = body.indexOf('>', start);
        if (start === -1) { return; }
        start++;

        var end = body.toLowerCase().indexOf('</title>', start);
        if (end === -1 || end === start + 1) { return; }

        cb(body.substring(start, end));
      }
    }
  );
}

function formatter(title) {
  title = encoder.htmlDecode(title).trim();
  if (title.length > (this.config.maxLength || 100)) {
    title = title.substr(0, (this.config.maxLength || 100) - 1).trim() + '…';
  }
  return 'Title: ' + title;
}


module.exports = {
  help: 'Outputs the title of a generic webpage',
  handler: handler,
  formatter: formatter
};