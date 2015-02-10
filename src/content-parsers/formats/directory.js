var fs = require('fs')
  , path = require('path');

var _ = require('lodash')
  , async = require('async');

var parsers = require('../parsers.js')
  , Properties = require('../../db/properties.js');

var E = require('../../utils/E.js')
  , filters = require('../../utils/filters.js')
  , file = require('../../utils/file.js');

var PROPERTIES_FILENAME = '_properties'
  , PROPERTIES_FILEFORMATS = [ 'html', 'yml', 'json', 'js' ];

function processFile(dirFile) {
  var filename = file.name(dirFile)
    , format = parsers.validateFormat(filename)
    , properties = new Properties(dirFile)
    , filename = file.name(dirFile)
    , defaultLocale = i18n.localeStringToParts(filename).locale || null;

  if (filename === PROPERTIES_FILENAME) {
    if (PROPERTIES_FILEFORMATS.indexOf(format) > -1) {
      return propertiesFileProcessor(dirFile, properties, null);
    }
    else {
      throw new Error('Properties file "' + dirFile + '" is not in the correct format: ' + PROPERTIES_FILEFORMATS.join(', '));
    }
  }
  else {
    // underscore can be used to promote a file as important without affecting the
    // generated property name or the reserved '_properties'
    var trimmed = filename[0] === '_' ? filename.substr(1) : filename;
    return regularFileProcessor(trimmed, dirFile, properties, null);
  }
}

function propertiesFileProcessor(dirFile) {
  return function(taskCallback) {
    // relativePath, properties, defaultLocale, callback
    parsers.processFile(dirFile, E.bubbles(taskCallback, function(properties) {
      taskCallback(null, properties || []);
    }));
  };
}

function regularFileProcessor(filename, dirFile, properties, defaultLocale) {
  return function(taskCallback) {
    // relativePath, properties, defaultLocale, callback
    parsers.processFile(dirFile, E.bubbles(taskCallback, function(propertyData) {
      taskCallback(null, [filename, (propertyData || '').toString()]);
    }));
  }
}

function underscoreFirst(a, b) {
  return a[0] !== b[0] && a[0] === '_' ? -1 : a < b;
}

// Directory is a special exception and doesn't match the signature of other formats
module.exports = function(relativePath, properties, defaultLocale, callback) {
  fs.readdir(relativePath, E.bubbles(callback, function(files) {
    files.sort(underscoreFirst);
    var parseFiles = files
      .filter(filters.dotfiles)
      .map(_.partial(path.join, relativePath))
      .map(processFile);
    async.parallelLimit(parseFiles, 6, callback);
  }));
};
