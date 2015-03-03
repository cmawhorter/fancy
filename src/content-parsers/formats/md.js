var marked = require('marked')
  , highlightJs = require('highlight.js');

var renderer = new marked.Renderer();
renderer.code = function(code, language){
  return '<pre><code class="hljs ' + language + '">' +
    highlightJs.highlight(language, code).value +
    '</code></pre>';
};

module.exports = function(contents, properties, defaultLocale, relativePath) {
  // markdown can't contain properties, so just pass it back to caller
  return marked(contents.toString('utf8'), { renderer: renderer });
};
