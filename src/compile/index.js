var fs = require('fs')
  , path = require('path')
  , url = require('url')
  , crypto = require('crypto');

var async = require('async')
  , mkdirp = require('mkdirp')
  , cheerio = require('cheerio')
  , glob = require('glob')
  , request = require('request')

  , rimraf = require('rimraf')
  , _ = require('lodash')

  , E = require('../utils/E.js')
  , log = require('../utils/log.js')
  , file = require('../utils/file.js')
  , tell = require('../utils/tell.js')
  , fingerprint = require('../utils/fingerprint.js')
  , wwwHelpers = require('../utils/www-helpers.js');

// request.debug = true;

var Fancy = require('../fancy/index.js');
var helpers = require('../fancy/helpers/index.js');
var workers = require('./workers.js');

function Compile(options, done) {
  options.concurrency = Math.max(0, (options.concurrency || 0) - 1); // workaround to hackish way cluster is added
  console.log('Fancy Options: ', options);
  this.fancy = new Fancy(options);
  this.done = done || function(){
    console.log('Done!');
    process.exit();
  };

  this.host = 'localhost';
  this.destination = './.fancy/compiled';

  log.debug('creating compile destination', path.join(process.cwd(), this.destination));
  mkdirp.sync(path.join(process.cwd(), this.destination));

  this.queue = null;
  this.workers = 1;
  this.knownRoutes = [];

  this.index = {};
}

// Compile.prototype.start = function(callback) {
//   var _this = this;

//   mkdirp.sync(_this.destination);
//   workers.endpoint = this.host + ':' + this.fancy.options.port;

//   if (_this.isMaster) {
//     _this.queue = async.queue(function(route, taskCallback) {
//       _this.addResource(route, request('http://localhost:3000' + route), taskCallback);
//     }, _this.workers);
//     _this.queue.drain = function() {
//       fs.writeFileSync(path.join(_this.destination, 'index.json'), JSON.stringify(_this.index, null, 2));
//       _this.done.apply(this, arguments);
//     };
//   }

//   _this.fancy.init(function(err) {
//     if (err) return callback(err);
//     // delay start until really, truly init
//     setTimeout(function() {
//       _this.onReady();
//       callback(null);
//     }, 1000);
//   });

//   // async.parallel([
//       // TODO: support multiple content directories
//   // var matches = glob('./data/content/**/*.html/public');
//   // for (var i=0; i < matches.length; i++) {
//   //   app.use(express.static(path.join(process.cwd(), matches[i])));
//   // }

//   // ], function() {

//   // });
// };

Compile.prototype.start = function(callback) {
  var _this = this;
  this.fancy.init(function(err) {
    if (err) return callback(err);
    // delay start until really, truly init
    setTimeout(function() {
      log.debug('fancy init complete; calling ready');
      _this.onReady(callback);
    }, 1000);
  });
};

Compile.prototype.onReady = function(callback) {
  var _this = this;
  var logger = log.child({ component: 'compiler' });
  var options = {
    content: 'content',
    assets: 'assets',
    target: this.destination,
    port: 3000,
    assetExtensions: null, //['png','gif','jpg','ico'], // not supported in 0.0.*
  };
  var destinationAssetsPath = file.abs(path.join(options.target, 'assets'));
  var dbPort = options.port + 100;


  logger.debug('on ready options', options);

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

  var themePath = file.abs('./' + (_this.fancy.options.theme ? 'themes/' + _this.fancy.options.theme : 'theme'));
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
    var allAssets = wwwHelpers.gatherAssets(assetPaths, options.assetExtensions, themeAssets);
    logger.trace({ list: allAssets.map(function(element) { return element.abs; }) }, 'assets found');

    // FIXME: only remove the expired files and not the whole directory.  see removeExpiredFiles TODO above
    logger.info({ target: destinationAssetsPath }, 'cleaning up compiled assets');
    rimraf(destinationAssetsPath, E.bubbles(taskCallback, function() {
      if (allAssets.length) {
        var uniqueAssets = _.where(allAssets, { collision: false })
          , assetMoveTasks = uniqueAssets.map(function(element) {
              return async.apply(moveAsset, element.abs, path.join(destinationAssetsPath, element.rel));
            });
        async.parallelLimit(assetMoveTasks, 32, E.bubbles(taskCallback, function() {
          logger.info({ list: _.pluck(uniqueAssets, 'abs'), destination: destinationAssetsPath }, 'assets moved');
          taskCallback();
        }));
      }
      else {
        taskCallback();
      }
    }));
  });

  compilationTasks.push(function(taskCallback) {
    var urls = (_this.fancy.options.buildRoutes || []).map(function(route) {
      return { resource: 'config', route: route };
    });

    for (var relativePath in _this.fancy.db.pages) {
      var page = _this.fancy.db.pages[relativePath];
      var utils = helpers({}, _this.fancy);
      if ('false' === page.getProperty('compile').toString()) { // if compile set to false, don't include it in compilation
        logger.trace({ file: relativePath }, 'skipping no compile');
      }
      else {
        var pageHash = page.toTemplateObject();
        // create a page for each route
        var routes = Array.isArray(pageHash.route) ? pageHash.route : [ pageHash.route ];
        var knownPageRoutes = [];
        for (var i=0; i < routes.length; i++) {
          if (knownPageRoutes.indexOf(routes[i]) < 0) {
            pageHash.route = routes[i];
            var pageUrl = utils.relative(null, pageHash);
            logger.debug({ resource: relativePath, route: pageUrl }, 'enqueue file');
            urls.push({ resource: relativePath, route: pageUrl });
            knownPageRoutes.push(routes[i]);
          }
        }
      }
    }

    logger.debug('Retrieved %s urls', urls.length);

    // TODO: conditional recompile. load index.json and compare compiled value against last revision

    var alreadyCrawled = [];
    var q = async.queue(function(task, queueCallback) {
      if (!task.route) {
        logger.warn('invalid task url', task);
        process.nextTick(queueCallback);
        return;
      }
      if (alreadyCrawled.indexOf(task.route) > -1) {
        logger.trace(task, 'skipping, already crawled');
        process.nextTick(queueCallback);
        return;
      }
      alreadyCrawled.push(task.route);
      var hashName = fingerprint.sync(task.route)
        , destination = path.join(options.target, hashName);
      var result = dictionary[hashName] = {
          url: task.route
        , resource: task.resource || 'missing:'
        , status: -1
        , fingerprint: null
        , location: null
      };
      logger.debug('\t-> Processing "%s" and writing to %s', task.route, destination);
      // TODO: if strict and non-200 status returned, error
      logger.trace('Retrieving %s', endpoint + task.route);
      request.get(endpoint + task.route)
        .on('error', E.event(queueCallback))
        .on('response', function(res) {
          result.fingerprint = res.headers['etag'];
          result.location = res.headers['location'];
          result.compiled = res.headers['fancy-compiled']; // used with conditional recompile
          result.status = res.statusCode;
        })
        .pipe(fs.createWriteStream(destination))
          .on('error', E.event(queueCallback))
          .on('finish', queueCallback);
    }, 12);

    _this.fancy.options.onRouteDiscovered = function(pageUrl, exists, relativePath) {
      if (!exists) {
        logger.debug({ path: 'unknown', url: pageUrl }, 'enqueue file (discovered)');
        q.push({ route: pageUrl, resource: relativePath });
      }
    }

    q.drain = function() {
      logger.debug('Writing index...', path.join(options.target, 'index.json'));
      fs.writeFileSync(path.join(options.target, 'index.json'), JSON.stringify(dictionary, null, 2));
      removeExpiredFiles(options.target, dictionary);
      logger.debug('Done crawling!');
      taskCallback();
    };

    urls.forEach(function(result, index) {
      logger.trace({ route: result.route, resource: result.resource, index: index }, 'url queue -> data');
      q.push(result);
    });
  });

  async.parallel(compilationTasks, function(err) {
    if (err) {
      logger.error({ err: err }, 'compilation task error');
      callback(err);
      return;
    }
    logger.info('compile complete');
    callback();
  });
};

// Compile.prototype.onReady = function() {
//   var _this = this;
//   console.log('Compile ready %s', process.pid);
//   (_this.fancy.options.buildRoutes || []).forEach(_this.enqueueUrl);

//   for (var relativePath in _this.fancy.db.pages) {
//     var page = _this.fancy.db.pages[relativePath];
//     var utils = helpers({}, _this.fancy);
//     if (false === page.getProperty('compile')) { // if compile set to false, don't include it in compilation
//       console.log('Skipping file (marked no compile): ', relativePath);
//     }
//     else {
//       console.log('Enqueue file: ', relativePath);
//       _this.enqueueUrl(utils.relative(null, page.toTemplateObject()));
//     }
//   }


//   // rimraf('./dist', function() {
//   //   mkdirp.sync('./dist');
//   //   // ncp('./themes/blah/public/', './dist', function (err) {
//   //   //  if (err) {
//   //   //    return console.error(err);
//   //   //  }
//   //   //  console.log('done!');
//   //   // });
//   //   process.exit(0);
//   // });
// };

Compile.prototype.enqueueUrl = function(route) {
  var _this = this;
  if (_this.isMaster && _this.knownRoutes.indexOf(route) < 0) {
    log.trace({ route: route }, 'discovered route');
    _this.queue.push(route);
    // request('http://localhost:3000' + task.route).pipe(writable);
  }
};

Compile.prototype.addResource = function(route, contents, callback) {
  if (!route) {
    log.error({ route: route }, 'Invalid route passed');
  }
  var hash = crypto.createHash('sha1').update(route || '').digest('hex');
  this.index[hash] = route;
  var writable = fs.createWriteStream(path.join(this.destination, hash));
  contents.pipe(writable);
  contents.on('end', callback);
};

// Compile.prototype.getWritable = function(route) {
//   var f = (route || '').toLowerCase().trim().replace(/[^\w\d]+/g, '-').replace(/\-\-+/g, '-').replace(/^\-+|\-+$/, '') + '.html';
//   return fs.createWriteStream(path.join(this.destination, f));
// };

module.exports = Compile;
