'use strict';

var WebUI = require('./webui')
  , moment = require('moment')
  , guid = require('node-guid');

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
  i.text = i.matches[1].trim();
  i.id = guid.new();
  i.timestamp = moment().format('HH:mm:ss');
  i.date = moment();
  this.webui.sendFeedback(i);
  this.feedback.unshift(i);
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
         help: 'Detects messages directed to AssemblyTV',
      handler: function (i, o) {
        feedback_handler.call(this, {from: i[0], matches: ['', i[1]]});
      },
    formatter: function (i) { return ''; }
  }
};

AsmTV.intervals = {
  'feedback': {
    name: 'feedback interval',
    interval: 3600000,
    handler: function (o) { o(); },
    formatter: function () { return "Lähetä palautetta studioon puhumalla minulle täällä tai queryssä!"; }
  }
};


module.exports = AsmTV;