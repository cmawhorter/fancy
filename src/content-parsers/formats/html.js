var cheerio = require('cheerio');
var parsers = require('../../content-parsers/parsers.js');

function elementToProperty(properties, $el, defaultLocale) {
  var key, value, locale;
  if ($el.length) {
    switch ($el[0].tag) {
      case 'meta':
      case 'property':
        key = $el.attr('key') || $el.attr('name');
        value = $el.attr('value') || $el.attr('content');
      break;
      case 'title':
        key = 'title';
        value = $el.text();
      break;
      case 'body':
        key = 'body';
        value = $el.html();
      break;
      default:
        throw new Error('Invalid element passed: ' + $el[0].tag);
    }
    if ($el.attr('lang')) {
      locale = $el.attr('lang');
    }
  }
  properties.append(parsers.localeProperty(key, value, locale || defaultLocale));
}

module.exports = function(contents, properties, defaultLocale, relativePath) {
  var $ = cheerio.load(contents)
    , documentLocale = $('html').attr('lang') || defaultLocale;

  // no property markup, just return entire file to caller and let it figure out what to do
  if (!$('html').length) {
    return contents.toString('utf8');
  }

  elementToProperty(properties, $('title'), documentLocale);
  elementToProperty(properties, $('body'), documentLocale);

  var contentType = 'text/html; charset=utf-8';
  $('meta[http-equiv][content]').each(function() {
    var $this = $(this);
    if ($this.attr('http-equiv').toLowerCase() === 'content-type') {
      contentType = $this.attr('content');
    }
  });
  properties.append('contentType', contentType, null); // special. global no matter what

  $('head>property,head>meta').each(function() {
    var $el = $(this);
    if ($el.attr('http-equiv')) return;
    elementToProperty(properties, $el, documentLocale);
  });
};
