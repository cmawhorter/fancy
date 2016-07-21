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
  var delayedFinishWarning = setTimeout(function() {
    _logger.warn('copy task is taking long time');
  }, 3000);
  var cleanup = function(err) {
    clearTimeout(delayedFinishWarning);
    done(err);
  };
  fs.exists(dest, function(yes) {
    if (yes) {
      _logger.trace({ exists: yes }, 'skipping');
      cleanup();
    }
    else {
      _logger.trace({ directory: destDir }, 'mkdirp');
      var copyErrorHandler = function(err) {
        _logger.error({ err: err, src: src, dest: dest }, 'copy task error');
        cleanup(err);
      };
      mkdirp(destDir, E.bubbles(cleanup, function() {
        var copy = fs.createReadStream(src)
          .on('error', E.event(copyErrorHandler))
          .pipe(fs.createWriteStream(dest))
          .on('error', E.event(copyErrorHandler))
          .on('finish', cleanup);
        _logger.trace({ source: src, destination: dest }, 'copying');
      }));
    }
  });
}

var prep = module.exports.prep = function prep(options, callback) {
  log.info({ dist: options.dist, build: options.buildDestination }, 'cleaning previous build');

  rimraf(options.dist, function(err) {
    if (err) {
      log.error({ err: err }, 'options.dist rimraf error');
      return callback(err);
    }
    rimraf(options.buildDestination, function(err) {
      if (err) {
        log.error({ err: err }, 'options.buildDestination rimraf error');
        return callback(err);
      }
      log.trace({ dist: options.dist, build: options.buildDestination }, 'creating buildDestination directory');
      mkdirp.sync(options.buildDestination);
      log.trace({ dist: options.dist, build: options.buildDestination }, 'creating dist directory');
      mkdirp.sync(options.dist);
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
    if (entry.status === 200) {
      tasks.push(iteratorHandler(k, entry, abs));
    }
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
  log.trace({ tasks: tasks.length, options: options }, 'beginning build tasks');
  async.parallelLimit(tasks, 8, function(err) {
    if (err) {
      log.error({ err: err }, 'build task error');
      return callback(err);
    }
    ncp(options.buildDestination, options.dist, function(err) {
      if (err) {
        log.error({ err: err, buildDestination: options.buildDestination, dist: options.dist }, 'build copy error');
        return callback(err);
      }
      log.debug('build complete');
      callback();
    });
  });
}
