var fs = require('fs');

var Properties = require('../db/properties.js');

var file = require('../utils/file.js')
  , E = require('../utils/E.js')
  , i18n = require('../utils/i18n.js');

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

function fileParser(relativePath, properties, defaultLocale, callback) {
  var format = validateFormat(relativePath);
  if (format) {
    fs.readFile(relativePath, E.bubbles(callback, function(contents) {
      availableParsers[format](contents, properties, defaultLocale, relativePath); // sync
      setImmediate(callback);
    }));
  }
  else {
    return callback(new Error('Invalid parser format "' + format + '"'));
  }
}

function directoryParser(relativePath, properties, defaultLocale, callback) {
  var ext = file.extension(relativePath);
  if (ext === 'html') {
    availableParsers.directory(relativePath, properties, defaultLocale, callback); // async
  }
  else {
    return callback(new Error('Invalid parser format for content directory "' + format + '"'));
  }
}

module.exports = {
  process: function(relativePath, siteLocale, callback) {
    isDirectory(function(yes) {
      var properties = new Properties()
        , filename = file.name(relativePath)
        , defaultLocale = i18n.localeStringToParts(filename).locale || siteLocale;
      (yes ? directoryParser : fileParser)(relativePath, properties, defaultLocale, E.bubbles(callback, function() {
        callback(null, properties);
      }));
    });
  },

  processFile: fileParser,
  processDirectory: directoryParser,

  // converts a property name in the format of "route" or "route.en-US" or "route.en" to a locale property object {'en-US':[['route','...']]}
  localeProperty: function(key, value, defaultLocale) {
    var localeStr = i18n.localeStringToParts(key || '__unknown');
    return {
        locale: localeStr.locale || defaultLocale
      , key: localeStr.root
      , value: value || ''
    };
  },

  validateFormat: validateFormat,
  parsers: availableParsers
};
