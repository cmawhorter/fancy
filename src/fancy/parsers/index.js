var fs = require('fs')
  , path = require('path');

var yaml = require('js-yaml')
  , marked = require('marked')
  , highlightJs = require('highlight.js');

marked.setOptions({
  highlight: function (code) {
    return highlightJs.highlightAuto(code).value;
  }
});

var html = require('./html');

var formats = {
  html: html,
  md: function(contents, callback) {
    callback(null, { body: marked(contents.toString('utf8')) });
  },

  txt: function(contents, callback) {
    callback(null, { body: contents.toString('utf8') });
  },

  json: function(contents, callback) {
    var obj = JSON.parse(contents);
    callback(null, typeof obj === 'object' ? obj : {});
  },

  yml: function(contents, callback) {
    var obj = yaml.load(contents.toString('utf8'));
    callback(null, typeof obj === 'object' ? obj : {});
  }
};

function detectFormat(f) {
  var ext = path.extname(f);
  if (ext.length > 0) {
    return ext.substr(1);
  }
  else {
    return '';
  }
}

function parse(relativePath, callback) {
  var format = detectFormat(relativePath);

  // TODO: replace with streams
  fs.readFile(relativePath, function(err, contents) {
    if (err) {
      return callback(err);
    }
    // console.log('parsing', relativePath, format);
    formats[format](contents, callback);
  });
}

parse.available = Object.keys(formats);

module.exports = parse;
