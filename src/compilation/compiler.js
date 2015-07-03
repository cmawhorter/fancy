var config = require('../config/config.js');

var fs = require('fs')
  , path = require('path')
  , crypto = require('crypto');

var async = require('async')
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , glob = require('glob')
  , request = require('request')
  , _ = require('lodash');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , file = require('../utils/file.js')
  , fingerprint = require('../utils/fingerprint.js');

var wwwHelpers = require('../server/www/helpers.js');

module.exports = {
  start: function(options, callback) {
    var logger = log.child({ component: 'compiler' });
    callback = E.timeout(callback || function(err){ if (err) throw err; });
    options = options || {};
    var destinationAssetsPath = file.abs(path.join(options.target, 'assets'));
    var dbPort = options.port + 100;

    function moveAsset(src, dest, callback) {
      var destDir = path.dirname(dest)
        , _logger = logger.child({ source: src, destination: dest });
      fs.exists(dest, function(yes) {
        if (yes) {
          _logger.trace({ exists: yes }, 'skipping');
          callback();
        }
        else {
          _logger.trace({ directory: destDir }, 'mkdirp');
          mkdirp(destDir, E.bubbles(callback, function() {
            var copy = fs.createReadStream(src)
              .on('error', E.event(callback))
              .pipe(fs.createWriteStream(dest))
              .on('error', E.event(callback))
              .on('finish', callback);
            _logger.trace({ source: src, destination: dest }, 'copying');
          }));
        }
      });
    }

    function removeExpiredFiles(dest, dictionary) {
      var keys = Object.keys(dictionary)
        , compiled = fs.readdirSync(dest);

      logger.debug({ directory: dest }, 'removing expired assets');

      for (var i=0; i < compiled.length;i ++) {
        var item = compiled[i]
          , f = path.join(dest, item);
        if (item !== 'index.json' && fs.statSync(f).isFile() && keys.indexOf(item) < 0) {
          logger.trace({ path: f, target: item }, 'removing expired asset');
          fs.unlinkSync(f);
        }
      }

      // TODO: remove expired assets.  for now they're just recreated every compile (slow)
    }

    tell('Starting compiler...');

    mkdirp.sync(destinationAssetsPath);

    tell('Destination confirmed: %s', options.target);

    var dictionary = {};
    var endpoint = 'http://localhost:' + options.port;

    tell('Endpoint: %s', endpoint);

    var themePath = './' + (options.theme ? 'themes/' + options.theme : 'theme');
    var themeAssets = file.abs(path.join(themePath, 'public'));
    var dataAssets = file.abs('./data/assets');
    var contentAssets = glob.sync(file.abs('./data/' + options.content + '/**/*.html/public'));
    var assetPaths = [themeAssets, dataAssets].concat(contentAssets);

    logger.info({ list: assetPaths }, 'gather assets');
    var allAssets = wwwHelpers.gatherAssets(assetPaths, config.data.assets, themeAssets);
    logger.trace({ list: allAssets.map(function(element) { return element.abs; }) }, 'assets found');

    // FIXME: only remove the expired files and not the whole directory.  see removeExpiredFiles TODO above
    logger.info({ target: destinationAssetsPath }, 'cleaning up compiled assets');
    rimraf(destinationAssetsPath, E.bubbles(callback, function(err) {
      if (allAssets.length) {
        var uniqueAssets = _.where(allAssets, { collision: false })
          , assetMoveTasks = uniqueAssets.map(function(element) {
              return async.apply(moveAsset, element.abs, path.join(destinationAssetsPath, element.rel));
            });
        async.parallelLimit(assetMoveTasks, 32, E.bubbles(callback, function() {
          logger.info({ list: _.pluck(uniqueAssets, 'abs'), destination: destinationAssetsPath }, 'assets moved');
        }));
      }
    }));

    var urls = options.site.urls(true, null, config.data.routes != 'explicit');
    tell('Retrieved %s urls', urls.length);

    var alreadyCrawled = [];
    var q = async.queue(function(task, queueCallback) {
      if (alreadyCrawled.indexOf(task.url) > -1) {
        logger.trace({ url: task.url }, 'skipping, already crawled');
        return queueCallback(null);
      }
      alreadyCrawled.push(task.url);
      var hashName = fingerprint.sync(task.url)
        , destination = path.join(options.target, hashName);
      var result = dictionary[hashName] = {
          url: task.url
        , status: -1
        , fingerprint: null
        , location: null
      };
      tell('\t-> Processing "%s" and writing to %s', task.url, destination);
      // TODO: if strict and non-200 status returned, error
      request.get(endpoint + task.url)
        .on('response', function(res) {
          result.fingerprint = res.headers['etag'];
          result.location = res.headers['location'];
          result.status = res.statusCode;
        })
        .pipe(fs.createWriteStream(destination))
          .on('error', E.event(queueCallback))
          .on('finish', queueCallback);
    }, 24);

    // TODO: get yield urls and append to end of queue
    // TODO: get other extraneous features like redirects, aliased routes and other stuff

    q.drain = function() {
      tell('Writing index...');
      fs.writeFileSync(path.join(options.target, 'index.json'), JSON.stringify(dictionary, null, 2));
      removeExpiredFiles(options.target, dictionary);
      tell('Done!');
      callback();
    };

    if (config.compile.entry) {
      logger.trace({ url: config.compile.entry }, 'url queue -> entry');
      q.push({ url: config.compile.entry });
    }

    if (Array.isArray(config.compile.force) && config.compile.force.length) {
      config.compile.force.forEach(function(pendingUrl, index) {
        logger.trace({ url: pendingUrl, index: index }, 'url queue -> force');
        q.push({ url: pendingUrl });
      });
    }

    urls.forEach(function(pendingUrl, index) {
      logger.trace({ url: pendingUrl, index: index }, 'url queue -> data');
      q.push({ url: pendingUrl });
    });
  }
};
