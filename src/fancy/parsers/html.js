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

  $('head>meta').each(function() {
    var $el = $(this)
      , name = $el.attr('name')
      , val = $el.attr('content') || '';

    if (name) {
      addProp(name, val);
    }
  });

  $('head>property').each(function() {
    var $el = $(this)
      , name = $el.attr('key')
      , val = $el.attr('value') || '';

    addProp(name, val);
  });

  console.log('parser html properties', properties);

  callback(null, properties);
};
