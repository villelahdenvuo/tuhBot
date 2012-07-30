var feedParser = require('feedparser')
  , log = new (require('../../../log'))('rss', 'rss.log');

function RSS(url, interval) {
  if (!url || typeof url !== 'string') {
    throw new Error('RSS(): First argument must be url (String).');
  }
  if (!interval || typeof interval !== 'number') {
    throw new Error('RSS(): Second argument must be interval (Number) in milliseconds.');
  }
  var rss = this;
  rss.queue = [];
  rss.url = url;
  rss.parser = new feedParser();
  rss.lastArticle = null;
  rss.intervalTime = interval;

  this.start();
}

RSS.prototype.update = function() {
  var rss = this;
  rss.parser.parseUrl(rss.url, {addmeta: false}, function(){ rss.articles.apply(rss, arguments); });
};

RSS.prototype.articles = function (err, meta, articles) {
  var rss = this;
  if (err) { log.exception(err, 'Feedparser failed to parse feed.'); return; }
  // Ignore the first run's articles
  if (!rss.lastArticle) { rss.lastArticle = new Date(articles[0].pubdate); }

  var newArticles = articles.filter(function (article) {
    if ((new Date(article.pubdate).getTime() - rss.lastArticle.getTime()) > 0) {
      return true;
    }
    return false;
  });

  log.debug('RSS: Feed update done, found ' + newArticles.length + ' new articles.', newArticles);

  if (newArticles.length) {
    // Update last article time so that we won't read them again.
    log.debug('Updating last article', {old: rss.lastArticle, new: new Date(newArticles[0].pubdate)});
    rss.lastArticle = new Date(newArticles[0].pubdate);

    newArticles.reverse();
    rss.queue = rss.queue.concat(newArticles);
  }
};

RSS.prototype.getArticle = function() {
  return this.queue.shift();
};

RSS.prototype.stop = function() {
  if (!this.running) { return false; }
  clearInterval(this.interval);
  this.queue = [];
  this.lastArticle = null;
  this.running = false;
  return true;
};

RSS.prototype.start = function() {
  var rss = this;
  if (rss.running) { return false; }
  rss.interval = setInterval(function () {
    rss.update();
  }, rss.intervalTime);
  rss.update();
  rss.running = true;
  return true;
};

module.exports = RSS;