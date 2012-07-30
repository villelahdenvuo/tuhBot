'use strict';

var WebUI = require('./webui');

var AsmTV = {
         name: 'AssemblyTV',
  description: 'stuff for AssemblyTV',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.1',
         init: init_asmtv,
       uninit: uninit_asmtv
};

function init_asmtv() {
  this.context.feedback = [];
  this.context.webui = new WebUI(this);
}

function uninit_asmtv() {
  this.context.webui.stop();
}

/*AsmTV.commands = {
  'AsmTV': {
           op: false,
         help: 'Prints out a string from config.',
         args: [{name: 'prefix', description: 'Appends before the message', default: 'Me: '}],
      handler: function (i, o) { o({message: this.config.string, prefix: i.args[0] || ''}); },
    formatter: function (o) { return i.prefix + i.message; }
  }
}
*/

function feedback_handler(i, o) {
  var feedback = i.matches[1].trim();
  this.webui.sendFeedback(i);
  this.feedback.unshift(feedback);
}

function feedback_formatter() {
  return;
}

AsmTV.routes = {
  'feedback': {
        route: /^assemblytv(?:,|:)(.*)$/i,
         help: 'Detects messages directed to AssemblyTV',
      handler: feedback_handler,
    formatter: feedback_formatter
  }
};

AsmTV.events = {
  'pm': {
         help: 'Anonymous poll input handler',
      handler: function (i, o) { o({someone: i[1], mode: i[2], somebody: i[3]}); },
    formatter: function (i) { return i.someone + ' gave +' + i.mode + ' to ' + i.somebody + '.'; }
  }
};


module.exports = AsmTV;