'use strict';

var fs = require('fs');

var URLTitle = {
         name: 'URLTitle',
  description: 'looks for links in messages and spews out information about them',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '1.3.1',
         init: init
};

function init() {
  var handlerFiles = fs.readdirSync(__dirname + '/handlers/');

  this.context.handlers = {};
  handlerFiles.forEach(function function_name (file, i) {
    var jsLoc = file.lastIndexOf('.js');
    if (jsLoc !== -1) {
      file = file.substr(0, jsLoc);
      this.context.handlers[file] = require(__dirname + '/handlers/' + file);
    }
  }, this);
}

function handler(info, cb) {
  var url = info.matches[0]
    , context = this
    , handlerNames = Object.keys(context.handlers);

  // Loop through every handler and try to match them before
  // falling back to the generic handler.
  for (var i = 0; i < handlerNames.length; i++) {
    var handler = context.handlers[handlerNames[i]]
      , matches = url.match(handler.route);

    if (matches) {
      handler.handler.call(context, matches, function (i) {
        cb(handler.formatter.call(context, i));
      });
      return; // We're done here.
    }
  }

  // Did not find a special handler, use the generic one.
  var genericHandler = require('./generic');

  genericHandler.handler.call(context, url, function (i) {
    cb(genericHandler.formatter.call(context, i));
  });
}

function formatter(i) {
  return i                        // Sanitize output
    .replace(/\n/g, ' ')          // Obliterate line changes
    .replace(/[ ]{2,}/g, ' ');    // Remove multiple spaces
}

URLTitle.routes = {
  'handler': {
    route: /(?:(?:https?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/i,
    help: 'Outputs the title of a webpage',
    handler: handler,
    formatter: formatter
  }
};


module.exports = URLTitle;