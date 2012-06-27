'use strict';

function URLTitle(io, config) {
  this.io = io;
  this.config = config;

  // Sanitize formatter outputs.
  Object.keys(this.routes).forEach(sanitize, this);
}

function sanitize(name) {
  var route = this.routes[name]
    , oldFormatter = route.formatter;

  // Replace the old formatter with this wrapper.
  route.formatter = function (i) {
    return oldFormatter(i)
      .replace(/\n/g, ' ')
      .replace(/[ ]{2,}/g, ' ');
  };

  return route;
}

URLTitle.prototype.routes = {
  'twitter': require('./twitter'),
  'youtube': require('./youtube'),
  'reddit': require('./reddit')
};


module.exports = {
         name: 'URLTitle',
  description: 'looks for links in messages and spews out information about them',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or tuhoojabotti@IRCNet',
      version: '0.2.3',
       module: URLTitle
};