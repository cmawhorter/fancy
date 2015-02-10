var file = require('../../utils/file.js')
  , E = require('../../utils/E.js')
  , i18n = require('../../utils/i18n.js');

module.exports = {
  // converts a property name in the format of "route" or "route.en-US" or "route.en" to a locale property object {'en-US':[['route','...']]}
  localeProperty: function(key, value, defaultLocale) {
    var localeStr = i18n.localeStringToParts(key || '__unknown');
    return {
        locale: localeStr.locale || defaultLocale
      , key: localeStr.root
      , value: value || ''
    };
  },
}
