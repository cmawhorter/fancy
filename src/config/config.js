var fs = require('fs')
  , path = require('path');

var _ = require('lodash');

var config = require('./configs/defaults.js');

var fancyConfig = path.join(process.cwd(), 'fancy.json');
var packageConfig = path.join(process.cwd(), 'package.json');

if (fs.existsSync(fancyConfig)) {
  config = _.merge(config, require(fancyConfig) || {});
  config.__source = fancyConfig;
}
else {
  var pkg = require(packageConfig);
  config = _.merge(config, (pkg || {}).fancy || {});
  config.__source = packageConfig;
}

module.exports = config;
