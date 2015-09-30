var path = require('path')
  , fs = require('fs');

var rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , ncp = require('ncp').ncp
  , async = require('async');

ncp.stopOnError = true;

var E = require('../utils/E.js')
  , log = require('../utils/log.js');

var cwd = process.cwd()
  , pkg = require(path.join(cwd, 'package.json'))
  , template = require('./static/templates/_package.json');

module.exports = {
  start: function(compile, callback) {
    var options = {
      output: './dist',
      target: 'node',
    };
    callback = E.timeout(callback || function(err){ if (err) throw err; });

    var source = path.join(cwd, compile.destination)
      , buildDestination = path.join(cwd, './.fancy/build')
      , destination = path.join(buildDestination, '/')
      , dist = path.join(cwd, options.output)
      , sourceAssets = path.join(source, 'assets')
      , destinationAssets = path.join(destination, '/assets')
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

    var IGNORED_KEYS = [ 'private', 'scripts' ];

    for (var k in template) {
      if (IGNORED_KEYS.indexOf(k) < 0) {
        template[k] = pkg[k] || '';
      }
    }

    template['dependencies'] = {
      'http-server': '*'
    };

    function copy(src, dest, callback) {
      var destDir = path.dirname(dest)
        , _logger = log.child({ source: src, destination: dest });
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

    log.info({ target: destination }, 'cleaning previous build');

    rimraf(dist, function(err) {
      if (err) {
        throw err;
      }
      rimraf(buildDestination, function(err) {
        if (err) {
          throw err;
        }
        log.trace({ target: destination, build: buildDestination }, 'creating build directory');
        mkdirp.sync(destination);

        if (options.target) {
          switch (options.target) {
            case 'node':
              var pkgPath = path.join(buildDestination, 'package.json');
              log.debug({ target: pkgPath }, 'creating package.json');
              fs.writeFileSync(pkgPath, JSON.stringify(template, null, 2));
            break;
            default:
              log.warn({ target: options.target }, 'invalid target');
            break;
          }
        }

        var tasks = [];

        log.debug({ directory: destination }, 'copying pages');
        log.trace({ list: Object.keys(index) });

        for (var k in index) {
          var entry = index[k];
          var abs = path.join(source, k);
          var diskUrl = entry.url;
          if (diskUrl[diskUrl.length - 1] === path.sep) {
            diskUrl += 'index';
          }
          if (!/\.[\w\d_-]+/.test(diskUrl)) { // don't add for urls with an extension
            diskUrl += '.' + ext;
          }
          tasks.push(async.apply(copy, abs, path.join(destination, diskUrl)));
        }

        log.debug({ directory: destination, source: sourceAssets }, 'copying assets');

        var assetPaths = fs.readdirSync(sourceAssets);
        assetPaths.forEach(function(assetPath) {
          tasks.push(function(callback) {
            var transactionSource = path.join(sourceAssets, assetPath)
              , transactionDestination = path.join(destinationAssets, assetPath);
            log.trace({ assetSource: transactionSource, assetDestination: transactionDestination }, 'found and copying assets');
            ncp(transactionSource, transactionDestination, callback);
          });
        });

        async.parallelLimit(tasks, 8, function(err) {
          if (err) {
            throw err;
          }
          mkdirp.sync(dist);
          ncp(buildDestination, dist, function(err) {
            if (err) {
              throw err;
            }
            callback(null, dist);
          });
        });
      });
    });
  }
};
