'use strict';

var format = require('util').format;

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

var Replace = {
         name: 'Replace',
  description: 'brings s/search/replace/ notation to life',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '1.0'
};

var searchRegex = new RegExp('^s/([^/]+)/([^/]*)/?', 'i');

Replace.routes = {
  'message': {
      route: /.*/,
       help: 'Any message',
    handler: function (i, o) {
      if (!this.lastMessages) { this.lastMessages = {}; }
      if (i.text.match(searchRegex)) { return; }
      this.lastMessages[i.from] = i.text;
    }
  },
  'replace': {
        route: searchRegex,
         help: 'Matches s/search/replace notation',
      handler: function (i, o) {
        if (this.lastMessages && this.lastMessages[i.from]) {
          try {
            i.replaced = this.lastMessages[i.from].replace(new RegExp(i.matches[1], 'gi'), i.matches[2]);
          } catch (e) {
            console.log('Warning'.yellow, 'Invalid regex in Replace module: ' + i.matches[1]);
          }
          o(i);
        }
      },
    formatter: function (i) {
      return format('%s meant: "%s"', i.from, i.replaced);
    }
  },
};

module.exports = Replace;