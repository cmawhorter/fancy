var cheerio = require('cheerio')
  , async = require('async');

module.exports = function processComponentHtml(html, components, logger, callback) {
  var $ = cheerio.load(html)
    , tasks = []
    , matchCount = 0;

  Object.keys(components).forEach(function(componentTag) {
    var component = components[componentTag];
    $(componentTag).each(function() {
      matchCount++;
      logger.trace({ component: componentTag }, 'creating task');
      var $this = $(this);
      tasks.push(async.apply(component, $this));
    });
  });

  logger.trace({ blocks: matchCount }, 'replacing component blocks');
  async.parallel(tasks, function(err) {
    if (err) return callback(err);
    callback(null, $.html());
  });
};
