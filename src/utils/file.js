var fs = require('fs')
  , path = require('path');

var regex = require('./regex.js');

module.exports = {
  abs: function(relative) {
    return path.join(process.cwd(), relative);
  },

  extension: function(f) {
    var ext = path.extname(f);
    return ext.length ? ext.substr(1) : '';
  },

  validateName: function(filename) {
    return regex.latin.test(filename);
  }
}
