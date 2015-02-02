var regex = require('./regex.js');

var i18n = {
  validId: function(lang) {
    return regex.lang.test(lang);
  }
};

module.exports = i18n;
