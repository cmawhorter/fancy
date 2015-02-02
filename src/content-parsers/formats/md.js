var marked = require('marked')
  , highlightJs = require('highlight.js');

marked.setOptions({
  highlight: function(code) {
    return highlightJs.highlightAuto(code).value;
  }
});

module.exports = function(contents, properties, defaultLocale, relativePath) {
  // markdown can't contain properties, so just pass it back to caller
  return marked(contents.toString('utf8'));
};
