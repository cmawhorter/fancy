var regex = require('./regex.js');

var i18n = {
  GLOBAL: 'global',

  validateCountryCode: function(locale) {
    if (!i18n.isValidLocale(locale)) {
      throw new Error('Invalid locale code "' + locale + '"');
    }
  },

  isValidLocale: function(locale) {
    return i18n.GLOBAL === locale || regex.locale.test(locale);
  },

  localeStringToParts: function(str) {
    var root = str
      , locale;
    if (str.indexOf('.') > -1) {
      var keyParts = str.split('.')
        , possibleLocale = keyParts.pop();
      if (i18n.isValidLocale(possibleLocale)) {
        root = keyParts.join('.');
        locale = possibleLocale;
      }
    }
    return {
        root: root
      , locale: locale
    }
  }
};

module.exports = i18n;
