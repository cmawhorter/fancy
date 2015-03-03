var vm = require('vm');

module.exports = function(contents, properties, defaultLocale, relativePath) {
  var sandbox = {
      Properties: properties
    , Env: process.env
    , Locale: defaultLocale
  };
  vm.runInNewContext(contents, sandbox, relativePath);
  return sandbox.Properties.data;
};
