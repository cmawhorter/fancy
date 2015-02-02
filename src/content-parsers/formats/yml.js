var yaml = require('js-yaml')
  , _ = require('lodash');

var i18n = require('../../utils/i18n.js');

module.exports = function(contents, properties, defaultLocale, relativePath) {
  var obj = yaml.load(contents.toString('utf8'));
  if (_.isArray(obj)) { // array of k/v or single k/v
    properties.add(_.isArray(obj[0]) ? obj : [obj], defaultLocale);
  }
  else if (_.isPlainObject(obj) && i18n.isValidLocale(Object.keys(obj)[0])) { // locale object
    properties.add(obj);
  }
  else { // not property format, let caller figure it out
    return obj;
  }
};
