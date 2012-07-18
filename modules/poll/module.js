'use strict';

var format = require('util').format;

function each(i, o, c) { if(i) {Object.keys(i).forEach(function (n) { o.call(c, n, i[n]); });} }

function join(arr, del, end) {
  var l = arr.length;
  if (l > 2) { return arr.splice(0, arr.length - 1).join(del) + end + arr[0]; }
  else { return arr.join(end); }
}

var Poll = {
         name: 'Poll',
  description: 'helps to organize polls',
       author: 'Ville "tuhoojabotti" Lahdenvuo',
      contact: 'tuhoojabotti at gmail or IRCNet',
      version: '1.0',
         init: function () { reset(this.context.poll = {}); }
};

function reset(poll) {
  poll.running = false;
  poll.choices = [];
  poll.question = '';
  poll.voters = [];
  poll.totalVotes = 0;
  clearTimeout(poll.timeout);
}

function pollHandler(info, cb) {
  var context = this, poll = this.poll;
  if (poll.running) { // End the poll.
    // Sort by vote count.
    poll.choices.sort(function (a, b) { return b.votes - a.votes;});
    var winners = [], last = poll.choices[0].votes;
    // See if we have ties.
    for (var c in poll.choices) {
      var choice = poll.choices[c];
      if (choice.votes === last) {
        winners.push(choice);
      } else { break; }
    }
    cb({type: 'end', winners: winners, poll: poll});
    reset(poll);
  } else if (info.args.length >= 3) { // Start a poll.
    poll.running = true;
    poll.question = info.args[0];
    poll.choices = [];
    poll.length = info.args.length - 1;
    info.args.slice(1).forEach(function (c, i) { poll.choices[i] = {votes: 0, text: c}; });
    cb({type: 'start', poll: poll});
    poll.timeout = setTimeout(function () { pollHandler.call(context, info, cb); },
      this.config.timeout || 60000 * 5);
  } else {
    cb({type: 'fail'});
  }
}

function pollFormatter(i) {
  switch(i.type) {
    case 'start':
      return format('Poll started. Choices: %s',
        i.poll.choices.map(function (c, i) { return (i + 1) + '. ' + c.text; }).join(' '));
    case 'end':
      if (i.winners.length === 1) {
        var winner = i.winners[0];
        return format('Poll ended. Winner is %s with %d %s. Total of %d %s given.',
          winner.text, winner.votes, winner.votes == 1 ? 'vote' : 'votes',
          i.poll.totalVotes, i.poll.totalVotes == 1 ? 'vote was' : 'votes were');
      } else {
        var votes = i.winners[0].votes;
        return format('Poll ended. Winners are %s with %d %s. Total of %d %s given.',
          join(i.winners.map(function(c) { return c.text; }), ', ', ' and '), votes,
          votes == 1 ? 'vote' : 'votes',
          i.poll.totalVotes, i.poll.totalVotes == 1 ? 'vote was' : 'votes were');
      }
    case 'fail': return 'Poll not running, you have to ask something to create a new one.';
  }
}

function voteHandler(info, cb) {
  if (!this.poll.running) { return; }

  var selection = parseInt(info.matches[1], 10);
  // Not a number or out of range.
  if (isNaN(selection) || selection > this.poll.length) { return; }
  // Already voted once.
  if (this.poll.voters.indexOf(info.from) !== -1) { cb(info.from); return; }

  this.poll.totalVotes++;
  this.poll.choices[selection - 1].votes++;
  this.poll.voters.push(info.from);
}


Poll.commands = {
  'poll': {
      command: 'poll',
           op: true,
         help: 'Allows you to hold a poll',
         args: [{name: 'question', description: 'what do you want to ask', default: 'none'},
                {name: 'choices', description: 'up to 9 possible answers', default: 'none'}],
      handler: pollHandler,
    formatter: pollFormatter
  }
};

Poll.routes = {
  'vote': {
    route: /^([1-9])/,
    help: 'Records votes to polls',
    handler: voteHandler,
    formatter: function voteFormatter(i) { return i + ', you have already voted!'; }
  }
};

module.exports = Poll;