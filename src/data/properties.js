var _ = require('lodash')
  , urlPattern = require('url-pattern');

var i18n = require('../utils/i18n.js');

// TODO: remove selectedLocale and move to getters.  this serves as a repo for all data

function Properties(relativePath, locale) {
  this.relativePath = relativePath;
  this.selectedLocale = locale || i18n.GLOBAL;
  this.data = {};
  this.data[i18n.GLOBAL] = [];
}

Properties.prototype.add = function(properties, locale) {
  var _this = this;
  if (Properties.isLocaleData(properties)) {
    for (var locale in properties) {
      this.add(properties, locale);
    }
  }
  else {
    locale = locale || this.selectedLocale;
    i18n.validateCountryCode(locale);
    this.data[locale] = this.data[locale] || [];
    (properties || []).forEach(function(element) {
      _this.data[locale].push([ element[0].trim().toLowerCase(), element[1] ]);
    });
  }
};

Properties.prototype.append = function(key, value, locale) {
  if (_.isPlainObject(key)) {
    locale = key.locale;
    value = key.value;
    key = key.key;
  }
  key = key.trim().toLowerCase();
  locale = locale || i18n.GLOBAL;
  this.add([ [key,value] ], locale);
};

Properties.prototype.copy = function(fromLocale, toLocale) {
  this.add(this.data[fromLocale] ? this.data[fromLocale].slice() : [], toLocale);
};

Properties.prototype.clone = function() {
  var properties = Properties.create(Object.create(this.data));
  properties.selectedLocale = this.selectedLocale;
  return properties;
};

Properties.prototype.get = function(locale) {
  var data = this.data[i18n.GLOBAL].slice()
    , localeData;
  if (locale) {
    localeData = this.data[locale].slice();
    for (var k in localeData) {
      data[k] = localeData[k];
    }
  }
  return data;
};

// converts to a hash of property => [ property, values ]
Properties.prototype.getAsHash = function(locale) {
  var data = this.get(locale)
    , result = {};
  for (var i=0; i < data.length; i++) {
    var property = data[i]
      , name = property[0].trim().toLowerCase()
      , value = property[1];
    result[name] = result[name] || [];
    result[name].push(value);
  }
  return result;
};

Properties.prototype.getProperty = function(name, locale) {
  var result = this.getPropertyForLocale(name, i18n.GLOBAL);
  return locale ? result.concat(this.getPropertyForLocale(name, locale)) : result;
};

Properties.prototype.getPropertyForLocale = function(name, locale) {
  var result = [];
  for (var i=0; i < this.data[locale].length; i++) {
    var data = this.data[locale][i]
      , dataName = data[0].trim().toLowerCase()
      , dataValue = data[1];
    if (dataName === name) {
      result.push(dataValue);
    }
  }
  return result;
};

Properties.prototype.hasProperty = function(name, locale) {
  if (this.hasPropertyForLocale(name, i18n.GLOBAL)) {
    return true;
  }
  for (var dataLocale in this.data) {
    if (dataLocale !== i18n.GLOBAL && this.hasPropertyForLocale(name, dataLocale)) {
      return true;
    }
  }
  return false;
};

Properties.prototype.hasPropertyForLocale = function(name, locale) {
  for (var i=0; i < this.data[locale].length; i++) {
    var dataName = this.data[locale][i][0].trim().toLowerCase();
    if (name === dataName) {
      return true;
    }
  }
  return false;
};

Properties.prototype.hasMatchingProperty = function(name, value, locale) {
  var values = this.getProperty(name, locale);
  for (var i=0; i < values.length; i++) {
    if (values[i] == value) {
      return true;
    }
  }
  return false;
};

Properties.prototype.getParamsForUrl = function(url) {
  var routes = this.getProperty('route');
  for (var i=0; i < routes.length; i++) {
    // console.log('url pattern matching "%s" to "%s"', property.content, url);
    var params = urlPattern.newPattern(routes[i]).match(url);
    // console.log(url, k, params);
    if (params) {
      return params;
    }
  }
  return null;
};

Properties.create = function(relativePath, obj) {
  if (Properties.isLocaleData(obj)) {
    var properties = new Properties(relativePath);
    properties.data = obj;
    if (!properties.data[i18n.GLOBAL]) {
      properties.copy(Object.keys(obj)[0], i18n.GLOBAL);
    }
    return properties;
  }
  throw new Error('Invalid object structure');
};

Properties.fromArray = function(arr, lang) {
  if (_.isArray(arr)) {
    var data = {};
    data[lang || i18n.GLOBAL] = arr;
    return Properties.create(data);
  }
  throw new Error('Cannot convert to property object');
};

Properties.isLocaleData = function(obj) {
  if (_.isPlainObject(obj)) {
    var firstKey = Object.keys(obj)[0];
    return i18n.isValidLocale(firstKey) && _.isArray(obj[firstKey]);
  }
  else {
    return false;
  }
}


module.exports = Properties;
