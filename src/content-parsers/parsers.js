var fs = require('fs');

var file = require('../utils/file.js')
  , E = require('../utils/E.js');

var availableParsers = {
  html: require('./formats/html.js'),
  md:   require('./formats/md.js'),
  txt:  require('./formats/txt.js'),
  json: require('./formats/json.js'),
  js:   require('./formats/js.js'),
  yml:  require('./formats/yml.js'),
  directory: require('./formats/directory.js') // content directories
};

function validateFormat(relativePath) {
  var format = file.extension(relativePath);
  switch (format) {
    case 'html':
    case 'htm':
      return 'html';
    case 'md':
    case 'markdown':
      return 'md';
    case 'json':
      return 'json'
    case 'js':
      return 'js';
    case 'yml':
    case 'yaml':
      return 'yml';
    case 'txt':
      return 'txt';
    default:
      return;
  }
}

function fileParser(relativePath, callback) {
  var format = validateFormat(relativePath);
  if (format) {
    fs.readFile(relativePath, E.bubbles(callback, function(contents) {
      availableParsers[format](contents, callback);
    });
  }
  else {
    return callback(new Error('Invalid parser format "' + format + '"'));
  }
}

function directoryParser(relativePath, callback) {
  var ext = file.extension(relativePath);
  if (ext === 'html') {
    availableParsers.directory(relativePath, callback);
  }
  else {
    return callback(new Error('Invalid parser format for content directory "' + format + '"'));
  }
}

module.exports = {
  process: function(relativePath, callback) {
    isDirectory(function(yes) {
      (yes ? directoryParser : fileParser)(relativePath, callback);
    });
  },

  processFile: processFile,
  processDirectory: processDirectory,

  validateFormat: validateFormat,
  parsers: availableParsers
};
