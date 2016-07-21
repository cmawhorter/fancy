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
  , log = require('../utils/log.js')
  , file = require('../utils/file.js')
  , fingerprint = require('../utils/fingerprint.js');

var wwwHelpers = require('../server/www/helpers.js');

module.exports = {
  start: function(options, callback) {
    var logger = log.child({ component: 'compiler' });
    callback = callback || function(err){ if (err) throw err; };
    options = options || {};
    options.content = options.content || 'content';
    options.assets = options.assets || 'assets';
    var destinationAssetsPath = file.abs(path.join(options.target, 'assets'));
    var dbPort = options.port + 100;

    function moveAsset(src, dest, done) {
      var destDir = path.dirname(dest)
        , _logger = logger.child({ source: src, destination: dest });
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

    logger.debug('Starting compiler...');

    mkdirp.sync(destinationAssetsPath);

    logger.debug('Destination confirmed: %s', options.target);

    var dictionary = {};
    var endpoint = 'http://localhost:' + options.port;

    logger.debug('Endpoint: %s', endpoint);

    var themePath = file.abs('./' + (options.theme ? 'themes/' + options.theme : 'theme'));
    var themeAssets = file.abs(path.join(themePath, 'public'));
    var dataAssets = file.abs('./data/' + options.assets);
    var contentAssets = glob.sync(file.abs('./data/' + options.content + '/**/*.html/public'));
    var assetPaths = [themeAssets, dataAssets].concat(contentAssets);

    logger.debug('compilation paths', {
      themePath: themePath,
      themeAssets: themeAssets,
      dataAssets: dataAssets,
      contentAssets: contentAssets,
      assetPaths: assetPaths,
      destinationAssetsPath: destinationAssetsPath,
    });

    var compilationTasks = [];

    compilationTasks.push(function(taskCallback) {
      logger.info({ list: assetPaths }, 'gather assets');
      var allAssets = wwwHelpers.gatherAssets(assetPaths, config.data.assets, themeAssets);
      logger.trace({ list: allAssets.map(function(element) { return element.abs; }) }, 'assets found');

      // FIXME: only remove the expired files and not the whole directory.  see removeExpiredFiles TODO above
      logger.info({ target: destinationAssetsPath }, 'cleaning up compiled assets');
      rimraf(destinationAssetsPath, E.bubbles(taskCallback, function() {
        if (allAssets.length) {
          var uniqueAssets = _.where(allAssets, { collision: false })
            , assetMoveTasks = uniqueAssets.map(function(element) {
                logger.trace({ path: destinationAssetsPath, element: element }, 'generating move task');
                return async.apply(moveAsset, element.abs, path.join(destinationAssetsPath, element.rel));
              });
          async.parallelLimit(assetMoveTasks, 32, E.bubbles(taskCallback, function() {
            logger.info({ list: _.pluck(uniqueAssets, 'abs'), destination: destinationAssetsPath }, 'Done moving assets!');
            taskCallback();
          }));
        }
        else {
          logger.debug('No assets to move. Done moving assets!');
          taskCallback();
        }
      }));
    });

    compilationTasks.push(function(taskCallback) {
      var urls = options.site.urls(true, null, config.data.routes != 'explicit');
      logger.debug('Retrieved %s urls', urls.length);

      // TODO: conditional recompile. load index.json and compare compiled value against last revision

      var totalTasks = 0;
      var completeTasks = 0;
      var successTasks = 0;
      var failedTasks = 0;
      var warnTasks = 0;
      var dupeTasks = 0;
      var skippedTasks = 0;

      var alreadyCrawled = [];
      var q = async.queue(function(task, queueCallback) {
        if (alreadyCrawled.indexOf(task.url) > -1) {
          logger.trace({ url: task.url }, 'skipping, already crawled');
          skippedTasks++;
          dupeTasks++;
          completeTasks++;
          process.nextTick(queueCallback);
          return;
        }
        alreadyCrawled.push(task.url);
        var hashName = fingerprint.sync(task.url)
          , destination = path.join(options.target, hashName);
        var requestErrorHandler = function(err) {
          failedTasks++;
          completeTasks++;
          logger.error({ err: err, task: task }, 'crawler request received error');
          queueCallback(err);
        };
        var result = dictionary[hashName] = {
            url: task.url
          , status: -1
          , fingerprint: null
          , location: null
        };
        // NOTE: this allows non-local routes to be used but not crawled
        // e.g. a route might be 'https://www.google.com' because you want it showing up
        // in a menu or something
        if (task.url[0] !== '/') {
          warnTasks++;
          skippedTasks++;
          completeTasks++;
          logger.warn({ task: task }, 'skipped because url does not start with "/"');
          process.nextTick(queueCallback);
          return;
        }
        logger.debug('\t-> Processing "%s" and writing to %s', task.url, destination);
        // TODO: if strict and non-200 status returned, error
        logger.trace('Retrieving %s', endpoint + task.url);
        request.get(endpoint + task.url)
          .on('error', E.event(requestErrorHandler))
          .on('response', function(res) {
            result.fingerprint = res.headers['etag'];
            result.location = res.headers['location'];
            result.compiled = res.headers['fancy-compiled']; // used with conditional recompile
            result.build = res.headers['fancy-build'] === 'true'; // should asset be included in build?
            result.status = res.statusCode;
            logger.trace({ url: task.url, result: result }, 'preliminary result built');
          })
          .pipe(fs.createWriteStream(destination))
            .on('error', E.event(requestErrorHandler))
            .on('finish', function() {
              successTasks++;
              completeTasks++;
              queueCallback();
            });
      }, 12);

      var enqueue = function(task) {
        q.push(task);
        totalTasks++;
      };

      var crawlNotifier = setInterval(function() {
        logger.info({
          total: totalTasks,
          pending: q.length(),
          complete: completeTasks,
          dupe: dupeTasks,
          success: successTasks,
          failed: failedTasks,
          warn: warnTasks,
          skipped: skippedTasks,
        }, 'crawl status');
      }, 1500);

      // TODO: get yield urls and append to end of queue
      // TODO: get other extraneous features like redirects, aliased routes and other stuff

      q.drain = function() {
        clearInterval(crawlNotifier);
        logger.debug('Writing index...', path.join(options.target, 'index.json'));
        fs.writeFileSync(path.join(options.target, 'index.json'), JSON.stringify(dictionary, null, 2));
        removeExpiredFiles(options.target, dictionary);
        logger.debug('Done crawling!');
        taskCallback();
      };

      if (config.compile.entry) {
        logger.trace({ url: config.compile.entry }, 'url queue -> entry');
        enqueue({ url: config.compile.entry });
      }

      if (Array.isArray(config.compile.force) && config.compile.force.length) {
        config.compile.force.forEach(function(pendingUrl, index) {
          logger.trace({ url: pendingUrl, index: index }, 'url queue -> force');
          enqueue({ url: pendingUrl });
        });
      }

      urls.forEach(function(rawUrl, index) {
        // FIXME: this is a workaround to cmawhorter/fancy#14 and cmawhorter/fancy#15 and will lead
        // to problems if a url is a false-positive
        // NOTE: this splits only on commas that are followed by a forward slash.  this should guard against
        // some false positives if path or query contains a comma
        var pendingUrls = rawUrl.indexOf(',/') > -1 ? rawUrl.split(/,(?=\/)/) : [ rawUrl ];
        pendingUrls.forEach(function(pendingUrl, workaroundIndex) {
          logger.trace({ rawUrl: rawUrl, url: pendingUrl, index: index, workaroundIndex: workaroundIndex }, 'url queue -> data');
          enqueue({ url: pendingUrl });
        });
      });
    });

    async.parallel(compilationTasks, function(err) {
      if (err) {
        logger.error({ err: err }, 'compilation task error');
        return callback(err);
      }
      logger.info('compile complete');
      callback();
    });
  }
};
