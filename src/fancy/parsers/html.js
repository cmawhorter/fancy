var cheerio = require('cheerio');

// these meta keys are considered csv and auto-separated.  TODO: make this configurable?
var arrayKeys = [ 'keywords' ];

module.exports = function(contents, callback) {
  $ = cheerio.load(contents);

  var properties = []
    , addProp = function addProp(name, val) {
        properties.push([name, val]);
      };

  addProp('title', $('title').text());
  addProp('body', $('body').html());

  var contentType = 'text/html; charset=utf-8';
  $('meta[http-equiv][content]').each(function() {
    var $this = $(this);
    if ($this.attr('http-equiv').toLowerCase() === 'content-type') {
      contentType = $this.attr('content');
    }
  });
  addProp('contentType', contentType);

  $('meta').each(function() {
    var $el = $(this)
      , name = $el.attr('name')
      , val = $el.attr('content') || '';

    if (name) {
      if (~arrayKeys.indexOf(name)) {
        val = val.split(/\s*,\s*/g);
        val.forEach(function(v) {
          addProp(name, v);
        });
      }
      else {
        addProp(name, val);
      }
    }
  });

  console.log('parser html properties', properties);

  callback(null, properties);
};
