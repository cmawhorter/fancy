var fs = require('fs')
  , path = require('path');

module.exports = {
  extension: function(f) {
    var ext = path.extname(f);
    return ext.length ? ext.substr(1) : '';
  }
}
