var fs = require('fs')
  , path = require('path');

var regex = require('./regex.js')
  , E = require('./E.js');

module.exports = {
  abs: function(relative) {
    return path.join(process.cwd(), relative);
  },

  extension: function(f) {
    var ext = path.extname(f);
    return ext.length ? ext.substr(1) : '';
  },

  name: function(f) {
    var ext = path.extname(f);
    return path.basename(f, ext);
  },

  validateName: function(filename) {
    return regex.latin.test(filename);
  },

  isDirectory: function(targ, callback) {
    fs.stat(targ, E.bubbles(callback, function(stats) {
      callback(null, stats.isDirectory());
    }));
  },

  isFile: function(targ, callback) {
    fs.stat(targ, E.bubbles(callback, function(stats) {
      callback(null, stats.isFile());
    }));
  },

}
