'use strict';

function URLTitle(config) {
  this.config = config;

  // Sanitize formatter outputs.
  Object.keys(this.routes).forEach(sanitize, this);
}

function sanitize(name) {
  var route = this.routes[name]
    , oldFormatter = route.formatter;

  route.formatter = function (i) {
    return oldFormatter(i)
      .replace(/\n/g, ' ')          // Obliterate line changes
      .replace(/[ ]{2,}/g, ' ');    // Remove multiple spaces
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