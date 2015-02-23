var config = require('../config/config.js');

var path = require('path')
  , fs = require('fs')
  , cluster = require('cluster');

var express = require('express')
  , axon = require('axon')
  , ejs = require('ejs')
  , glob = require('glob')
  , _ = require('lodash');

var watcher = require('./watcher.js')
  , context = require('../data/context.js');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , file = require('../utils/file.js')
  , helpers = require('./www/helpers.js');

module.exports = {
  start: function(options, callback) {
    callback = callback || function(err){ if (err) throw err; };
    options = options || {};
    options.livereloadport = options.livereloadport || 35729;
    var dbPort = options.port + 1;
    var themePath = './' + (options.theme ? 'themes/' + options.theme : 'theme');
    var viewPath = file.abs(themePath + '/views');
    var staticAssetOptions = {
      extensions: config.data.assets
    };

    var themeAssets = file.abs(path.join(themePath, 'public'));
    var dataAssets = file.abs('./data/assets');
    var contentAssets = glob.sync(file.abs('./data/' + options.content + '/**/*.html/public'));

    tell('Starting server...');

    var sock = axon.socket('req');
    sock.connect(dbPort);

    var createContext = context({
        extensions: null
      , theme: null
      , viewPath: viewPath
      , config: config
      , env: helpers.loadEnv(config.theme.env)
      , yieldHandler: function(yieldUrl) {
          // TODO: db.request
          if (config.theme.yield) {
            console.log('URL discovered %s', yieldUrl);
          }
          else {
            log.trace({ url: yieldUrl }, 'yield disabled');
          }
        }
      , liveReloadPort: options.livereloadport
    });

    if (!options.workers || cluster.isMaster) {
      tell('Master starting watcher');
      var site = watcher.start({
          target: path.join(process.cwd(), './data/' + options.content)
        , port: dbPort
        , livereloadport: options.livereloadport
        , themePath: themePath
      }, E.bubbles(callback, function() {
        // FIXME: wrapping this in a delay for now since there isn't a clear-cut ready event being emitted
        setTimeout(function() {
          if (config.strict) {
            var locale = null; // TODO: iterate over all locales, verifying each
            var urls = site.urls(false, locale, config.data.routes != 'explicit')
              , uniqUrls = _.uniq(urls);
            if (urls.indexOf(null) > -1) {
              log.fatal({ err: new Error('Unreachable content') });
              process.exit(1);
            }
            else if (!config.data.collisions && uniqUrls.length !== urls.length) {
              var dupes = urls.filter(function(element, index) {
                return index === urls.lastIndexOf(element) && urls.indexOf(element) !== index;
              });
              log.debug({ list: dupes }, 'dupe routes');
              return callback(new Error('Page collisions'));
            }
          }
        }, 500);
      }));

      var assetCollisions = helpers.findAssetCollisions([themeAssets, dataAssets].concat(contentAssets), config.data.assets);
      if (assetCollisions.length) {
        log.info({ list: assetCollisions }, 'asset collisions')
        if (config.data.collisions) {
          tell('Warning: There were %s assets with colliding filenames.  This could lead to incorrect images being displayed or worse.', assetCollisions.length);
        }
        else {
          return callback(new Error('Asset collision'));
        }
      }
    }

    if (options.workers && cluster.isMaster) {
      for (var i = 0; i < options.workers; i++) {
        helpers.fork();
      }

      cluster.on('online', function(worker) {
        console.log('[%s] worker online', worker.process.pid);
      });

      cluster.on('exit', function(worker, code, signal) {
        console.log('[%s] worker ded', worker.process.pid);
        helpers.fork();
      });
    }
    else {
      tell('\t-> Worker started', process.pid);

      var app = express();
      app.set('port', options.port || defaultOptions.port);

      app.set('env', 'development');
      app.enable('case sensitive routing');
      app.enable('strict routing');

      // view engine setup
      app.set('views', viewPath);
      app.set('view engine', 'ejs');
      app.disable('view cache');

      app.use(express.static(themeAssets, staticAssetOptions));
      app.use(express.static(dataAssets, staticAssetOptions));
      for (var i=0; i < contentAssets.length; i++) {
        app.use(express.static(contentAssets[i], staticAssetOptions));
      }

      app.use(function(err, req, res, next) {
        helpers.renderError(req, res, err);
      });

      if (config.cli.serve.remotecontrol) {
        app.get('/__fancy__/:command', function(req, res) {
          switch (req.params.command.toLowerCase()) {
            case 'shutdown':
              log.info({ req: req }, 'received shutdown');
              res.end('Goodbye');
              setImmediate(process.exit);
            break;

            default:
              res.end('Command not understood');
            break;
          }
        });
      }

      var router = express.Router();
      router.get('*', function(req, res, next) {
        // tell('Handled', process.pid, new Date().getTime(), req.url);
        log.trace({ req: req });

        for (var route in config.data.redirects) {
          var re = new RegExp(route);
          log.trace({ url: req.url, re: re.toString() }, 'testing url for redirects');
          if (route === req.url || re.test(req.url)) {
            var val = config.data.redirects[route];
            var redirectUrl = req.url.replace(re, val);
            log.trace({ url: req.url, re: re.toString(), replace: val, redirect: redirectUrl }, 'redirect matched');
            log.info({ url: req.url, redirect: redirectUrl }, 'config redirect');
            res.redirect(301, redirectUrl);
            return;
          }
        }

        sock.send('find', { url: req.url, locale: null }, function(data) {
          if (!data || data.error) {
            console.log('not found in db');
            return helpers.renderError(req, res, new Error(data.error.message || 'DB Error'));
          }

          var context = createContext(data.filepath, data.properties, helpers.buildRequest(req), data.resources);
          context.usingResolver = function(using, taskCallback) {
            var obj = { key: using.key };
            if (typeof using.value === 'function') {
              obj.fn = using.value.toString();
            }
            else {
              obj.value = using.value;
            }
            sock.send('matching', obj, function(data) {
              using.result.retrieved = data.pages;
              taskCallback();
            });
          };

          var contentType = context.page.text('contenttype', 'text/html')
            , body = context.page.first('body');

          if (contentType.indexOf(';') > -1) {
            contentType = contentType.split(';')[0].trim().toLowerCase();
          }

          switch (contentType) {
            case 'application/json':
              res.json(body);
              return;
            case 'application/javascript':
              var jsVar = context.page.text('scopetarget', 'window["' + req.url + '"]');
              res.status(200).contentType('application/javascript').send(jsVar + ' = ' + JSON.stringify(body));
              return;
            case 'text/plain':
              res.status(200).contentType('text/plain').send(body);
              return;
            default:
            case 'text/html':
              var layout = 'layouts/' + context.page.first('layout', 'primary')
                , layoutPath = path.join(viewPath, layout + '.ejs')
                , viewContents = fs.readFileSync(layoutPath).toString();
              var html = ejs.render(viewContents, {
                  locals: context
                , filename: layoutPath
              });
              if (context.__uses) {
                context.resolve(function(err) {
                  if (err) {
                    return helpers.renderError(req, res, new Error('Unable to retrieve all uses data'));
                  }
                  res.render(layout, context);
                });
              }
              else {
                res.status(200).contentType('text/html; charset=utf-8').send(html);
              }
              return;
            }
        });
      });
      app.use('/', router);
      app.listen(options.port, E.exits(true));
    }
  }
};
