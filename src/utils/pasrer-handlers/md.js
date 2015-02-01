var marked = require('marked')
  , highlightJs = require('highlight.js');

marked.setOptions({
  highlight: function (code) {
    return highlightJs.highlightAuto(code).value;
  }
});

module.exports = function(contents, callback) {
  callback(null, { body: marked(contents.toString('utf8')) });
};
