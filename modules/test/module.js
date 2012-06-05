function Test(io, config) {
  this.io = io;
  this.config = config;
  io.command('test', this, this.test, this.testFormatter);
  io.route(/:\)/, this, this.smiley, this.smileyFormatter);
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

module.exports = Test;