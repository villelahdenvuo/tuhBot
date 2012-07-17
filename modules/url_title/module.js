'use strict';

var fs = require('fs')
  , colors = require('colors');

var URLTitle = {
         name: 'URLTitle',
  description: 'looks for links in messages and spews out information about them',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '1.3.1',
         init: init
};

function init() {
  var handlers = this.context.handlers = {};
  fs.readdirSync(__dirname + '/handlers/').forEach(function eachFile(file) {
    var ext = file.lastIndexOf('.js');
    if (ext === -1) { return; }
    file = file.substr(0, ext);   // Remove file extension.
    handlers[file] = require(__dirname + '/handlers/' + file);
  }, this);
}

function handler(info, cb) {
  var url = info.matches[0], context = this
    , handlerNames = Object.keys(context.handlers);

  // Loop through handlers for a match before
  // falling back to the generic handler.
  for (var i in handlerNames) {
    var handler = context.handlers[handlerNames[i]]
      , matches = url.match(handler.route);

    if (matches) {
      context.log.debug('Found a matching handler for url', {
        url: url,
        handler: handlerNames[i]
      });
      callHandler(handler, context, matches, cb);
      return; // Found a matching handler, we're done.
    }
  }

  context.log.debug('Falling back to generic url handler.', {url: url});
  // Did not find a special handler, use the generic one.
  callHandler(require('./generic'), context, url, cb);
}

function callHandler(handler, context, matches, cb) {
  function onHandlerDone(i) {
    try { cb(handler.formatter.call(context, i)); }
    catch (e) { context.log.exception(e); }
  }
  try { handler.handler.call(context, matches, onHandlerDone); }
  catch (e) { context.log.exception(e); }
}

function formatter(i) {
  if (!i) { return; }
  return i                        // Sanitize output
    .replace(/\n|\t/g, ' ')       // Obliterate line changes and tabs
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