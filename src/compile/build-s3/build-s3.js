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

    var seenRoutes = [];
    var addRoutingRule = function(route, hashKey) {
      if (seenRoutes.indexOf(route) < 0) {
        seenRoutes.push(route);
        routingRules.push(' <RoutingRule>');
        routingRules.push('   <Condition>');
        routingRules.push('     <KeyPrefixEquals>' + entities.encode(route) + '</KeyPrefixEquals>');
        routingRules.push('   </Condition>');
        routingRules.push('   <Redirect>');
        routingRules.push('     <ReplaceKeyWith>' + hashKey + '</ReplaceKeyWith>');
        routingRules.push('   </Redirect>');
        routingRules.push(' </RoutingRule>');
      }
    };

    tasks = utils.eachObject(index, options, function(hashKey, entry, abs) {
      var route = entry.url.toString().substr(1);
      if (!route.trim().length) {
        route = '/';
      }
      var hashKeyWithExtension = hashKey + '.' + (/\.[\w\d_-]+$/.test(route) ? route.split('.').pop() : options.ext);
      addRoutingRule(route, hashKeyWithExtension);
      if (route[route.length - 1] === path.sep) {
        addRoutingRule(route.length > 1 ? route + 'index.html' : 'index.html', hashKeyWithExtension);
      }
      return async.apply(utils.copy, abs, path.join(options.destination, hashKeyWithExtension));
    });

    routingRules.push('</RoutingRules>');
    fs.writeFileSync(path.join(options.destination, '.rules.xml'), routingRules.join('\n'));

    Array.prototype.push.apply(tasks, utils.copyAllAssets(options));
    utils.build(tasks, options, callback);
  });
};
