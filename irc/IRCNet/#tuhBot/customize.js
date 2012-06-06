var util = require('util');
var modulePath = '../../../modules/'

// Override Test module.
var Test = require(modulePath + 'test/module');
function TestWrapper(io, config) {
  Test.call(this, io, config);
}
util.inherits(TestWrapper, Test);

// Override testFormatter for this channel.
TestWrapper.prototype.testFormatter = function (i) {
  return '"' + i.message + '"';
};


module.exports = {'test': TestWrapper};