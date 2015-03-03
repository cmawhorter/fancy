var fs = require('fs')
  , path = require('path');

var _ = require('lodash')
  , async = require('async');

var Properties = require('../../data/properties.js');

var E = require('../../utils/E.js')
  , filters = require('../../utils/filters.js')
  , i18n = require('../../utils/i18n.js')
  , file = require('../../utils/file.js');

var PROPERTIES_FILENAME = '_properties'
  , PROPERTIES_FILEFORMATS = [ 'html', 'yml', 'json', 'js' ];

function processFile(parsers, dirFile, properties, defaultLocale, callback) {
  var filename = file.name(dirFile)
    , format = parsers.validateFormat(dirFile)
    , defaultLocale = i18n.localeStringToParts(filename).locale || defaultLocale;

  console.log('filename: %s, format: %s, defaultLocale: %s', filename, format, defaultLocale)

  if (filename === PROPERTIES_FILENAME) {
    if (PROPERTIES_FILEFORMATS.indexOf(format) > -1) {
      parsers.processFile(dirFile, properties, defaultLocale, callback);
    }
    else {
      throw new Error('Properties file "' + dirFile + '" is not in the correct format: ' + PROPERTIES_FILEFORMATS.join(', '));
    }
  }
  else {
    // underscore can be used to promote a file as important without affecting the
    // generated property name or the reserved '_properties'
    var trimmed = filename[0] === '_' ? filename.substr(1) : filename;
    // we don't want the formatted data, just the raw parsed data
    var fakeProperties = new Properties(dirFile);
    parsers.processFile(dirFile, fakeProperties, defaultLocale, E.bubbles(callback, function(output) {
      properties.append(trimmed, output, defaultLocale);
      callback(null);
    }));
  }
}

function underscoreFirst(a, b) {
  return a[0] !== b[0] && a[0] === '_' ? -1 : a < b;
}

// Directory is a special exception and doesn't match the signature of other formats
module.exports = function(relativePath, properties, defaultLocale, callback) {
  var parsers = this;
  fs.readdir(relativePath, E.bubbles(callback, function(files) {
    files.sort(underscoreFirst);
    var parseFiles = files.filter(filters.dotfiles)
      , tasks = [];
    parseFiles.forEach(function(element) {
      tasks.push(async.apply(processFile, parsers, path.join(relativePath, element), properties, defaultLocale));
    });
    async.parallelLimit(tasks, 6, function() {
      console.log('relativePath', relativePath, arguments, properties);
      callback(null, properties);
    });
  }));
};
