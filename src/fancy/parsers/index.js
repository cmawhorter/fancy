var fs = require('fs')
  , path = require('path');

var yaml = require('js-yaml');

var formats = {
  html: require('./html'),
  md: function(contents, callback) {

  },

  txt: function(contents, callback) {

  },

  yml: function(contents, callback) {

  },
  yaml: this.yml
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

module.exports = function(data, f, callback) {
  var format = detectFormat(f);

  // TODO: replace with streams
  fs.readFile(f, function(err, contents) {
    if (err) {
      return callback(err);
    }
    console.log('parsing', f, format);
    formats[format](data, contents);
    callback(null);
  });
};
