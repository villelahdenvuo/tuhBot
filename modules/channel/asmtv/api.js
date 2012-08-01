var express = require('express');
var config = require('./config');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect(config.base);
}

function API(module) {
  var self = this;
  self.module = module;
  var app = self.app = express();
  /*app.configure(function() {
    app.set("views", __dirname + '/web/views');
    app.set('view engine', 'jade');
    app.set('view options', {layout: false});
    app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });*/
  self.init();
}

API.prototype.init = function () {
  var self = this
    , api = self.app
    , feedback = self.module.context.feedback;

  api.use(ensureAuthenticated);

  api.get('/', function (req, res) {
    res.end('API FAIL');
  });

  api.get('/comment/:id', function (req, res) {
    var f = self.getFeedback(req.params.id);
    if (f) {
      res.render('feedback', f);
    } else {
      res.end('FAIL');
    }
  });

  api.get('/comment/:id/delete', function (req, res) {
    var f = self.getFeedback(req.params.id);
    if (f) {
      feedback.splice(feedback.indexOf(f), 1);
      res.end('OK');
    } else {
      res.end('FAIL');
    }
  });
};

API.prototype.getFeedback = function (id) {
  var self = this;
  for (var i = self.module.context.feedback.length - 1; i >= 0; i--) {
    var f = self.module.context.feedback[i];
    if (f.id === id) { return f; }
  };
};

module.exports = API;