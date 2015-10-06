require('http').globalAgent.maxSockets = require('https').globalAgent.maxSockets = 20;

var path = require('path')
  , fs = require('fs');

var rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , ncp = require('ncp').ncp
  , async = require('async');

ncp.stopOnError = true;

var Entities = require('html-entities').XmlEntities;
var entities = new Entities();

var utils = require('../shared/utils.js');
var E = require('../../utils/E.js')
  , log = require('../../utils/log.js');

// <RoutingRules>
//   <RoutingRule>
//   <Condition>
//     <KeyPrefixEquals>docs/</KeyPrefixEquals>
//   </Condition>
//   <Redirect>
//     <ReplaceKeyWith>documents/</ReplaceKeyWith>
//   </Redirect>
//   </RoutingRule>
// </RoutingRules>

module.exports = function(index, options, callback) {
  utils.prep(options, function(err) {
    var tasks;

    tasks = utils.eachObject(index, options, function(hashKey, entry, abs) {
      var diskUrl = Array.isArray(entry.url) ? entry.url[0] : entry.url;
      if (diskUrl[diskUrl.length - 1] === path.sep) {
        diskUrl += 'index.html';
      }
      else {
        var parts = diskUrl.split('/');
        var partFilename = '.collision.' + parts.pop();
        diskUrl = parts.join('/') + '/' + partFilename;
      }
      // if (!/\.[\w\d_-]+$/.test(diskUrl)) { // don't add for urls with an extension
      //   diskUrl += '.' + options.ext;
      // }
      var source = path.join(options.destination, diskUrl);
      log.debug({ key: k, entry: entry, abs: abs, from: source, to: diskUrl }, 'creating copy task');
      return async.apply(utils.copy, abs, source);
    });

    Array.prototype.push.apply(tasks, utils.copyAllAssets(options));
    utils.build(tasks, options, callback);
  });
};
