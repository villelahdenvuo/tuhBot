var feedParser = require('feedparser');
//  , request = require('request');

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

  rss.interval = setInterval(function () {
    rss.update();
  }, interval);
  rss.update();
}

RSS.prototype.update = function() {
  var rss = this;
  rss.parser.parseUrl(rss.url, function(){ rss.articles.apply(rss, arguments); });
};

RSS.prototype.articles = function (err, meta, articles) {
  var rss = this;
  if (err) {console.error(err); return; }
  // Ignore the first run's articles
  if (!rss.lastArticle) { rss.lastArticle = new Date(articles[0].date); }

  var newArticles = articles.filter(function (article) {
    if ((new Date(article.date).getTime() - rss.lastArticle.getTime()) > 0) {
      return true;
    }
    return false;
  });

  //console.log('RSS: Feed update done, found %d new articles.', newArticles.length);

  newArticles.reverse();
  rss.queue = rss.queue.concat(newArticles);

  // Update last article time so that we won't read them again.
  rss.lastArticle = new Date(articles[0].date);
};

RSS.prototype.getArticle = function() {
  return this.queue.shift();
};

RSS.prototype.stop = function() {
  clearInterval(this.interval);
};

module.exports = RSS;