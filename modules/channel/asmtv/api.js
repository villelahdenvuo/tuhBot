var express = require('express');
var config = require('./config');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect(config.base);
}

function API(module) {
  var self = this;
  self.module = module;
  self.app = express();
  self.init();
}

API.prototype.init = function () {
  var self = this
    , api = self.app;

  api.use(ensureAuthenticated);

  api.get('/', function (req, res) {
    res.end('API FAIL');
  });

  api.get('/comment/:index', function (req, res) {
    console.dir(req.params);
    res.end('OK');
  });

  api.del('/comment/:index', function (req, res) {
    console.dir(req.params);
    res.end('OK');
  });
};


module.exports = API;