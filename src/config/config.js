var fs = require('fs')
  , path = require('path')
  , assert = require('assert');

var _ = require('lodash');

var config = require('./configs/defaults.js')
  , freeze = require('../utils/freeze.js');

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

Object.defineProperty(config, 'utils', {
  value: {
    split: function(str, lower) {
      var arr;
      if (Array.isArray(str)) {
        arr = str;
      }
      else {
        arr = (str || '').toString().trim().split(/\s*[,;]\s*/);
      }
      return lower ? arr.map(Function.prototype.call, String.prototype.toLowerCase) : arr;
    }
  }
});

config.data.formats = config.utils.split(config.data.formats, true);
config.data.assets = config.utils.split(config.data.assets, true);

if (config.compile.strict) {
  // only well defined formats allowed for pages (content directories still accept everything)
  assert.ok(false, _.difference(config.data.formats, config.__strict['data:formats']).length);

  // only regular images
  assert.ok(false, _.difference(config.data.assets, config.__strict['data:assets']).length);

  // don't allow collisions
  assert.strictEqual(config.__strict['data:collisions'], config.data.collisions);

  // route urls must be explicit or higher
  assert.strictEqual(true, config.__strict['data:routes'].indexOf(config.data.routes) > -1);

  // themes cannot create new urls
  assert.strictEqual(config.__strict['compile:yield'], config.theme.yield);

  // all links/assets must resolve
  assert.strictEqual(config.__strict['compile:verify'], config.compile.verify);
}

freeze(config);

module.exports = config;
