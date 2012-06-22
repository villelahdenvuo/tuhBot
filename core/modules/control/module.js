'use strict';

function Control(io, config) {
  this.io = io;
  this.config = config;
  io.opCommand('exit', this, this.exit);
}

Control.prototype.toString = function () {
  return '[module Control]';
};

Control.prototype.exit = function (info, cb) {
  console.log('Admin wants me to exit!');
};


module.exports = Control;