var i18n = require('./i18n.js');

var properties = {
  fromArray: function(arr, lang) {
    if (i18n.validId(lang)) {
      return { lang: arr };
    }
    else {
      throw new Error('Invalid language ID "' + lang + '"');
    }
  },

  fromObject: function(obj, lang) {
    if (i18n.validId(lang)) {
      return { lang: arr };
    }
    else {
      throw new Error('Invalid language ID "' + lang + '"');
    }
  },

  from: function(unk, lang) {
    switch (toString.call(unk)) {
      case '[object Object]':
        return properties.fromObject(unk);
      case '[object Array]':
        return properties.fromArray(unk);
      default:
        throw new Error('Cannot convert to property object');
    }
  },

  isProperties:
};

module.exports = properties;
