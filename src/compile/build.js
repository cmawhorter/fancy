var path = require('path')
  , fs = require('fs');

var rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , ncp = require('ncp').ncp
  , async = require('async');

ncp.stopOnError = true;

var E = require('../utils/E.js')
  , log = require('../utils/log.js');

var buildNode = require('./build-node/build-node.js');
var buildS3 = require('./build-s3/build-s3.js');

module.exports = {
  start: function(compileDestination, target, callback) {
    var options = {
      output: './dist',
      target: target,
    };

    var cwd = process.cwd();

    var source = path.join(cwd, compileDestination)
      , buildDestination = path.join(cwd, './.fancy/build')
      , destination = path.join(buildDestination, '/')
      , dist = path.join(cwd, options.output)
      , sourceAssets = path.join(source, 'assets')
      , destinationAssets = path.join(destination, '/')
      , indexPath = path.join(source, 'index.json')
      , ext = 'html'
      , index;

    log.debug('initializing build', {
      source: source,
      buildDestination: buildDestination,
      destination: destination,
      dist: dist,
      sourceAssets: sourceAssets,
      destinationAssets: destinationAssets,
      indexPath: indexPath,
      ext: ext,
    });

    // TODO: if config.build.destination isn't "/", then all hrefs have to be rewritten

    if (!fs.existsSync(indexPath)) {
      throw new Error('No index.json file exists.  Please run compile first');
    }

    index = require(indexPath);

    var builder;
    switch (options.target) {
      case 'node':
        builder = buildNode;
      break;
      case 's3':
        // TODO: copy generic error to error.html
        builder = buildS3;
      break;
      default:
        log.warn({ target: options.target }, 'invalid target');
      break;
    }

    builder(index, {
      source: source,
      buildDestination: buildDestination,
      destination: destination,
      dist: dist,
      sourceAssets: sourceAssets,
      destinationAssets: destinationAssets,
      indexPath: indexPath,
      ext: ext,
    }, callback);
  }
};
