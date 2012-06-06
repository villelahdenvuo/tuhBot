function Test(io, config) {
  this.io = io;
  this.config = config;
  io.command('test', this, this.test, this.testFormatter);
  io.route(/:\)/, this, this.smiley, this.smileyFormatter);
  io.on('+mode', this, this.addMode, this.addModeFormatter);
}

Test.prototype.test = function (info, cb) {
  cb({'message': this.config.string});
};

Test.prototype.testFormatter = function (i) {
  return i.message;
};

Test.prototype.smiley = function (info, cb) {
  cb({message: info.message});
}

Test.prototype.smileyFormatter = function (i) {
  return "Found a smiley in message: " + i.message;
};

Test.prototype.addMode = function (args, cb) {
  cb({who: args[1], what: args[2], to: args[3]});
};

Test.prototype.addModeFormatter = function (i) {
  return i.who + " gave +" + i.what + " to " + i.to + "."; 
};

module.exports = Test;