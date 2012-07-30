'use strict';

var request = require('request');

function shorten(url, cb) {
  // Custom shortener for reddit links.
  var reddit = url.match(/(?:reddit\.com\/r\/\w+\/comments|redd\.it)\/(\w+)/i);
  if (reddit) {
    cb(null, 'http://redd.it/' + reddit[1]);
  } else {
    urly(url, cb);
  }
}

function urly(url, cb) {
  function UrlyError(e) {
    this.name = "UrlyError";
    this.message = "Urly API call failed with error code " + e;
  }
  UrlyError.prototype = new Error();
  UrlyError.prototype.constructor = UrlyError;

  request('http://urly.fi/api/shorten/?url=' + url,
    function (err, res, code) {
      if (err || res.statusCode !== 200) { cb(new UrlyError(res.statusCode)); }
      cb(null, 'http://urly.fi/' + code);
    }
  );
}

module.exports = shorten;