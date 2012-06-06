var argv = require('optimist')
    .default({d: false})
    .alias({'d': 'debug', 'h': 'help'})
    .describe({'d': 'Spam a lot.'})
    .usage('Run tuhBot: $0')
    .check(function (a) {return !a.h;})
    .argv;

var fs = require('fs')
  , cp = require('child_process')
  , colors = require('colors');

function Core() {
  this.networks = {};
  this.loadNetworks();
}

Core.prototype.loadNetworks = function () {
  // Load networks.
  var networks = fs.readdirSync(__dirname + '/irc');
  networks.forEach(this.initNetwork, this);
};

Core.prototype.initNetwork = function (id) {
  var core = this;
  core.networks[id] = cp.fork(__dirname + '/network.js', [id], {'cwd': __dirname + '/irc/' + id});
  core.networks[id].on('message', function (msg) {
    core.networkMessage(id, msg);
  });
};

Core.prototype.networkMessage = function (network, msg) {
  switch (msg.type) {
    case 'message':
      //console.log('Message received from %s', network.green);
      //console.dir(msg);
      break;
    default:
      //console.log('Received an unknown message from %s', network.green);
      //console.dir(msg);
  }
};

// Create a new bot.
var bot = new Core();