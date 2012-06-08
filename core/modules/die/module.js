function Die(io, config) {
  this.io = io;
  this.config = config;
  io.command('die', this, this.die);
}

Die.prototype.toString = function () {
  return '[module Die]';
};

Die.prototype.die = function (info, cb) {
  if (info.from == 'tuhoojabotti') {
    // Jea
  }
};


module.exports = Die;