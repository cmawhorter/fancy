var path = require('path')
  , fs = require('fs');

var rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , ncp = require('ncp').ncp
  , async = require('async');

ncp.stopOnError = true;

var utils = require('../shared/utils.js');
var E = require('../../utils/E.js')
  , log = require('../../utils/log.js');

var template = require('./templates/_package.json');

module.exports = function(index, options, callback) {
  var pkg = require(path.join(process.cwd(), 'package.json'));
  var IGNORED_KEYS = [ 'private', 'scripts' ];

  for (var k in template) {
    if (IGNORED_KEYS.indexOf(k) < 0) {
      template[k] = pkg[k] || '';
    }
  }

  template['dependencies'] = {
    'http-server': '*'
  };

  var pkgPath = path.join(options.buildDestination, 'package.json');
  log.debug({ target: pkgPath }, 'creating package.json');
  fs.writeFileSync(pkgPath, JSON.stringify(template, null, 2));

  utils.prep(options, function(err) {
    var tasks;

    tasks = utils.eachObject(index, options, function(k, entry, abs) {
      var diskUrl = Array.isArray(entry.url) ? entry.url[0] : entry.url;
      if (diskUrl[diskUrl.length - 1] === path.sep) {
        diskUrl += 'index';
      }
      if (!/\.[\w\d_-]+$/.test(diskUrl)) { // don't add for urls with an extension
        diskUrl += '.' + options.ext;
      }
      return async.apply(utils.copy, abs, path.join(options.destination, diskUrl));
    });

    Array.prototype.push.apply(tasks, utils.copyAllAssets(options));
    utils.build(tasks, options, callback);
  });
};
