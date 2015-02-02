var _ = require('lodash');
var i18n = require('../utils/i18n.js');

function Properties(locale) {
  this.selectedLocale = locale || i18n.GLOBAL;
  this.data = {};
  this.data[i18n.GLOBAL] = [];
}

Properties.prototype.add = function(properties, locale) {
  if (Properties.isLocaleData(properties)) {
    for (var locale in properties) {
      this.add(properties, locale);
    }
  }
  else {
    locale = locale || this.selectedLocale;
    i18n.validateCountryCode(locale);
    this.data[locale] = this.data[locale] || [];
    Array.prototype.push.apply(this.data[locale], properties || []);
  }
};

Properties.prototype.append = function(key, value, locale) {
  if (_.isPlainObject(key)) {
    locale = key.locale;
    value = key.value;
    key = key.key;
  }
  locale = locale || i18n.GLOBAL;
  this.add([ [key,value] ], locale);
};

Properties.prototype.copy = function(fromLocale, toLocale) {
  this.add(this.data[fromLocale] ? Object.create(this.data[fromLocale]) : [], toLocale);
};

Properties.prototype.clone = function() {
  var properties = Properties.create(Object.create(this.data));
  properties.selectedLocale = this.selectedLocale;
  return properties;
};




Properties.create = function(obj) {
  if (Properties.isLocaleData(obj)) {
    var properties = new Properties();
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
