var path = require('path')
  , fs = require('fs');

var rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , ncp = require('ncp').ncp
  , async = require('async');

var E = require('../../utils/E.js')
  , log = require('../../utils/log.js');

var copy = module.exports.copy = function copy(src, dest, done) {
  var destDir = path.dirname(dest)
    , _logger = log.child({ source: src, destination: dest });
  fs.exists(dest, function(yes) {
    if (yes) {
      _logger.trace({ exists: yes }, 'skipping');
      done();
    }
    else {
      _logger.trace({ directory: destDir }, 'mkdirp');
      mkdirp(destDir, E.bubbles(done, function() {
        var copy = fs.createReadStream(src)
          .on('error', E.event(done))
          .pipe(fs.createWriteStream(dest))
          .on('error', E.event(done))
          .on('finish', done);
        _logger.trace({ source: src, destination: dest }, 'copying');
      }));
    }
  });
}

var prep = module.exports.prep = function prep(options, callback) {
  log.info({ target: options.destination }, 'cleaning previous build');

  rimraf(options.dist, function(err) {
    if (err) {
      return callback(err);
    }
    rimraf(options.buildDestination, function(err) {
      if (err) {
        return callback(err);
      }
      log.trace({ target: options.destination, build: options.buildDestination }, 'creating build directory');
      mkdirp.sync(options.destination);
      callback();
    });
  });
}

var eachObject = module.exports.eachObject = function eachObject(index, options, iteratorHandler) {
  log.debug({ directory: options.destination }, 'copying pages');
  log.trace({ list: Object.keys(index) });

  var tasks = [];
  for (var k in index) {
    var entry = index[k];
    var abs = path.join(options.source, k);
    tasks.push(iteratorHandler(k, entry, abs));
  }
  return tasks;
}

var copyAllAssets = module.exports.copyAllAssets = function copyAllAssets(options) {
  log.debug({ directory: options.destination, source: options.sourceAssets }, 'copying assets');
  var tasks = [];
  var assetPaths = fs.readdirSync(options.sourceAssets);
  assetPaths.forEach(function(assetPath) {
    tasks.push(function(taskCallback) {
      var transactionSource = path.join(options.sourceAssets, assetPath)
        , transactionDestination = path.join(options.destinationAssets, assetPath);
      log.trace({ assetSource: transactionSource, assetDestination: transactionDestination }, 'found and copying assets');
      ncp(transactionSource, transactionDestination, taskCallback);
    });
  });
  return tasks;
}

var build = module.exports.build = function build(tasks, options, callback) {
  async.parallelLimit(tasks, 8, function(err) {
    if (err) {
      return callback(err);
    }
    mkdirp.sync(options.dist);
    ncp(options.buildDestination, options.dist, function(err) {
      if (err) {
        return callback(err);
      }
      callback();
    });
  });
}
