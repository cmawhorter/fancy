var fs = require('fs')
  , path = require('path');

var _ = require('lodash')
  , async = require('async');

var parsers = require('../parsers.js');

var E = require('../../utils/E.js')
  , filters = require('../../utils/filters.js')
  , file = require('../../utils/file.js');

var PROPERTIES_FILENAME = '_properties'
  , PROPERTIES_FILEFORMATS = [ 'html', 'yml', 'json', 'js' ];

function processFile(dirFile) {
  var filename = file.name(dirFile)
    , format = parsers.validateFormat(filename);

  if (filename === PROPERTIES_FILENAME) {
    if (PROPERTIES_FILEFORMATS.indexOf(format) > -1) {
      return propertiesFileProcessor(dirFile);
    }
    else {
      throw new Error('Properties file "' + dirFile + '" is not in the correct format: ' + PROPERTIES_FILEFORMATS.join(', '));
    }
  }
  else {
    return regularFileProcessor(filename, dirFile);
  }
}

function propertiesFileProcessor(dirFile) {
  return function(taskCallback) {
    parsers.processFile(dirFile, E.bubbles(taskCallback, function(properties) {
      taskCallback(null, properties || []);
    });
  };
}

function regularFileProcessor(filename, dirFile) {
  return function(taskCallback) {
    parsers.processFile(dirFile, E.bubbles(taskCallback, function(propertyData) {
      taskCallback(null, [filename, (propertyData || '').toString()]);
    });
  }
}

function underscoreFirst(a, b) {
  return a[0] !== b[0] && a[0] === '_' ? -1 : a < b;
}

// Directory is a special exception and doesn't match the signature of other formats
module.exports = function(relativePath, callback) {
  fs.readdir(relativePath, E.bubbles(callback, function(files) {
    var parseFiles = files.filter(filters.dotfiles);
    parseFiles.sort(underscoreFirst);
    async.parallelLimit(parseFiles.map(processFile), 6, callback);
  }));
};
