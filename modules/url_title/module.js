'use strict';

var URLTitle = {
         name: 'URLTitle',
  description: 'looks for links in messages and spews out information about them',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '0.2.3',
         init: init
};

function init() {
  // Add a sanitizer to all formatters.
  Object.keys(this.routes).forEach(function (name) {
    var route = this.routes[name]
      , oldFormatter = route.formatter;

    route.formatter = function (i) {
      return oldFormatter(i)
        .replace(/\n/g, ' ')          // Obliterate line changes
        .replace(/[ ]{2,}/g, ' ');    // Remove multiple spaces
    };
  }, this);
}

URLTitle.routes = {
  'twitter': require('./twitter'),
  'youtube': require('./youtube'),
  'reddit': require('./reddit')
};


module.exports = URLTitle;