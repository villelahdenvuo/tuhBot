'use strict';

var request = require('request');

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

module.exports = urly;