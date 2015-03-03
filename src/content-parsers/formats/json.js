var _ = require('lodash');
var i18n = require('../../utils/i18n.js');
module.exports = function(contents, properties, defaultLocale, relativePath) {
  var obj = JSON.parse(contents);
  if (_.isArray(obj)) { // array of k/v or single k/v
    properties.add(_.isArray(obj[0]) ? obj : [obj], defaultLocale);
  }
  else if (_.isPlainObject(obj)) {
    if (i18n.isValidLocale(Object.keys(obj)[0])) { // locale object
      properties.add(obj);
    }
    else {
      for (var k in obj) {
        var val = Array.isArray(obj[k]) ? obj[k] : [obj[k]];
        val.forEach(function(element) {
          properties.append(k, element);
        });
      }
    }
  }

  return obj;
};
