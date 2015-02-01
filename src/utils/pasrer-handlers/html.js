var cheerio = require('cheerio');

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

  $('head>property,head>meta').each(function() {
    var $el = $(this);
    if ($el.attr('http-equiv')) return;
    var key = $el.attr('key') || $el.attr('name')
      , val = $el.attr('value') || $el.attr('content') || '';

    addProp(key, val);
  });

  // console.log('parser html properties', properties);

  callback(null, properties);
};
