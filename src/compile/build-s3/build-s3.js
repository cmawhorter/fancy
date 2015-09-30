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
    var routingRules = [];
    routingRules.push('<?xml version="1.0"?>');
    routingRules.push('<RoutingRules>');

    tasks = utils.eachObject(index, options, function(k, entry, abs) {
      var route = entry.url.toString().substr(1);
      routingRules.push(' <RoutingRule>');
      routingRules.push('   <Condition>');
      routingRules.push('     <KeyPrefixEquals>' + (route.trim().length ? entities.encode(route) : '/') + '</KeyPrefixEquals>');
      routingRules.push('   </Condition>');
      routingRules.push('   <Redirect>');
      routingRules.push('     <ReplaceKeyWith>' + k + '</ReplaceKeyWith>');
      routingRules.push('   </Redirect>');
      routingRules.push(' </RoutingRule>');

      return async.apply(utils.copy, abs, path.join(options.destination, k));
    });

    routingRules.push('</RoutingRules>');
    fs.writeFileSync(path.join(options.destination, '.rules.xml'), routingRules.join('\n'));

    Array.prototype.push.apply(tasks, utils.copyAllAssets(options));
    utils.build(tasks, options, callback);
  });
};
