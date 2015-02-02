var vm = require('vm');

module.exports = function(contents, properties, defaultLocale, relativePath) {
  var sandbox = {
      properties: properties
    , defaultLocale: defaultLocale
    , ret: null
  };
  vm.runInNewContext('ret = (function(properties, defaultLocale) { ' + contents + ' })(properties, defaultLocale);', sandbox, relativePath);
  if (sandbox.ret) {
    return sandbox;
  }
};
