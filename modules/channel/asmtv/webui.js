var express = require('express')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , api = require('./api')
  , sio = require('socket.io')
  , http = require('http');

var config = require('./config');

function findById(id, fn) {
  var idx = id - 1;
  if (config.users[idx]) {
    fn(null, config.users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = config.users.length; i < len; i++) {
    var user = config.users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect(config.base);
}

function WebUI(module) {
  var self = this;
  self.module = module;

  self.sockets = [];
  // Start the web server
  self.init();
  self.initIO();
}

WebUI.prototype.initIO = function () {
  var self = this
  var app = http.createServer(function(){});
  var io = self.io = sio.listen(app);
  app.listen(config.socketPort);

  io.sockets.on('connection', function (socket) {
    console.log('New connection', socket);
    self.sockets.push(socket);
    socket.on('disconnect', function () {
      console.log('Client disconnected.');
      self.sockets.splice(self.sockets.indexOf(socket), 1);
    });
  });
};

WebUI.prototype.sendFeedback = function (message) {
  this.sockets.forEach(function (socket) {
    socket.emit('feedback', message);
  });
};

WebUI.prototype.init = function () {
  var self = this;

  // Set up logging in with passport
  passport.serializeUser(function(user, done) { done(null, user.id); });
  passport.deserializeUser(function(id, done) {
    findById(id, function (err, user) { done(err, user); });
  });
  passport.use(new LocalStrategy(
    function verify(username, password, done) {
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (user.password != password) { return done(null, false); }
        return done(null, user);
      });
    }
  ));

  var app = self.app = express();
  self.api = new api(self.module);

  app.configure(function() {
    // Setup templating
    app.set("views", __dirname + '/web/views');
    app.set('view engine', 'jade');
    app.set('view options', {layout: false});
    app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
    // Setup necessary modules
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.session({secret: config.secret}));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.use(express.static(__dirname + '/web/public'));
  });

  // Handle connections

  app.use('/api', self.api.app);

  app.get('/', function (req, res) { self.index(req, res); });

  app.post('/login', passport.authenticate('local', { failureRedirect: config.base }),
    function (req, res) { res.redirect(config.base); });

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect(config.base);
  });


  self.listener = app.listen(config.port);
  console.log('Web UI listening on port', config.port);
};

WebUI.prototype.index = function (req, res) {
  var self = this;

  if (req.isAuthenticated()) {
    res.render("main", {
      authenticated: req.isAuthenticated(),
      user: req.user,
      feedback: self.module.context.feedback
    });
  } else { res.render("main", {authenticated: false}); }
};

WebUI.prototype.stop = function () {
  this.listener.close();
  this.io.close();
};

module.exports = WebUI;