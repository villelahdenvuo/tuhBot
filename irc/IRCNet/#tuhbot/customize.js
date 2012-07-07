var util = require('util');
var modulePath = '../../../modules/'

// Override Test module.
var Test = require(modulePath + 'test/module');

// Override testFormatter for this channel.
Test.commands.test.formatter = function (i, o) {
  return '"' + i.prefix + i.message + '"';
};

module.exports = {
  'test': Test
};
