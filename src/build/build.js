var config = require('../config/config.js');

var path = require('path')
  , fs = require('fs');

var rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , ncp = require('cpr')
  , async = require('async');

ncp.stopOnError = true;

var E = require('../utils/E.js')
  , log = require('../utils/log.js');

var cwd = process.cwd();

var buildNode = require('./build-node/build-node.js');
var buildS3 = require('./build-s3/build-s3.js');

module.exports = {
  start: function(options, callback) {
    options = options || {};
    options.output = options.output || config.build.path;
    callback = callback || function(err){ if (err) throw err; };

    var source = path.join(cwd, './.fancy/compiled')
      , buildDestination = path.join(cwd, '.fancy/build')
      , destination = path.join(buildDestination, config.build.destination)
      , dist = path.join(cwd, options.output)
      , sourceAssets = path.join(source, 'assets')
      , destinationAssets = path.join(destination, config.build.assets.destination)
      , indexPath = path.join(source, 'index.json')
      , ext = config.build.extension.length ? config.build.extension : 'html'
      , index;


    // TODO: if config.build.destination isn't "/", then all hrefs have to be rewritten

    if (!fs.existsSync(indexPath)) {
      return callback(new Error('No index.json file exists.  Please run compile first'));
    }

    index = require(indexPath);

    var filteredIndex = {};
    for (var k in index) {
      var entry = index[k];
      if (entry.build) {
        filteredIndex[k] = entry;
      }
      else {
        log.debug({ entry: entry }, 'skipping not included in build');
      }
    }

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
        throw new Error('Invalid target: ' + options.target);
    }

    log.info({
      source: source,
      buildDestination: buildDestination,
      destination: destination,
      dist: dist,
      sourceAssets: sourceAssets,
      destinationAssets: destinationAssets,
      indexPath: indexPath,
      ext: ext,
    }, 'starting builder ' + options.target);

    builder(filteredIndex, {
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
