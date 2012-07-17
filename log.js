'use strict';

var fs = require('fs')
  , stream = require('stream')
  , jsonstream = require('JSONStream');

function Log(name, out) {
  var log = this;
  log.name = name;
  if (typeof out === 'string') {
    log.out = fs.createWriteStream(out);
  } else if (out instanceof stream) {
    log.out = out;
  } else {
    throw new Error('Log ' + log.name +
      ': Second argument must be file (string) or a writable stream.');
  }

  log.in = new jsonstream.stringify();

  // Connect input to output
  log.in.pipe(log.out);
}

// Raw write function.
Log.prototype.write = function(o) {
  if (!this.out.writable) {
    console.log('Log', this.name, 'is not writeable.'); return;
  }
  try { this.in.write(o); }
  catch (e) { console.error('Failed to write to log:', this.name, e.stack); }
};

// Helpers for common loggables.
////////////////////////////////

Log.prototype.debug = function(text, o) {
  var msg = {type: 'debug', level: 0, timestamp: Date.now()};

  msg.msg = text;
  msg.debug = o; // Additional information object

  this.write(msg);
};

Log.prototype.info = function(text, o) {
  var msg = {type: 'info', level: 1, timestamp: Date.now()};

  msg.info = text;
  msg.details = o;

  this.write(msg);
};

Log.prototype.msg = function(net, o) {
  var msg = {type: 'message', level: 2, timestamp: Date.now()};

  o.network = net;
  msg.message = o;

  this.write(msg);
};

Log.prototype.exception = function(e, text) {
  var msg = {type: 'exception', level: 5, timestamp: Date.now()};

  msg.description = text || '';
  msg.stack = e.stack;

  this.write(msg);
};

module.exports = Log;