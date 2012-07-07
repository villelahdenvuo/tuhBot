var util = require('util');
var modulePath = '../../../modules/'

// Override Test module.
var Test = require(modulePath + 'test/module').module;
function TestWrapper(io, config) {
  Test.call(this, io, config);
}
util.inherits(TestWrapper, Test);

// Override testFormatter for this channel.
TestWrapper.prototype.commands.test.formatter = function (i, o) {
  return '"' + i.prefix + i.message + '"';
};

module.exports = {
  'test': {
           name: 'Test',
    description: 'A simple module to demonstrate how to make modules.',
         author: 'Ville "tuhoojabotti" Lahdenvuo',
        contact: 'tuhoojabotti at gmail or tuhoojabotti at IRCNet',
         module: TestWrapper
  }
};
