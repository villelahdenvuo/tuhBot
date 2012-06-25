'use strict';

function Control(io, config) {
  this.io = io;
  this.config = config;
  io.opCommand('exit', this, this.exit);
  io.opOn('invite', this, this.invite);
}

Control.prototype.toString = function () {
  return '[module Control]';
};

Control.prototype.exit = function (info, cb) {
  this.io.core.exit();
};

Control.prototype.invite = function (info, cb) {
  // Send join command to network.
  this.io.send(info[0], ['JOIN', info[1]]);
};

module.exports = Control;