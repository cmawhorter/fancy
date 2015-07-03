var config = require('../config/config.js');

var path = require('path')
  , fs = require('fs');

var express = require('express')
  , axon = require('axon')
  , glob = require('glob')
  , async = require('async')
  , _ = require('lodash');

var watcher = require('./watcher.js')
  , context = require('../data/context.js');

var E = require('../utils/E.js')
  , log = require('../utils/log.js')
  , file = require('../utils/file.js')
  , helpers = require('./www/helpers.js')
  , sendResponse = require('./www/response.js');

module.exports = {
  start: function(options, callback) {
    var logger = log.child({ component: 'www' });
    var exportsObjects = { site: null, app: null };
    callback = E.timeout(callback || function(err){ if (err) throw err; });
    options = options || {};
    options.livereloadport = options.livereloadport || 35729;
    var dbPort = options.port + 100;
    var themePath = file.abs('./' + (options.theme ? 'themes/' + options.theme : 'theme'));
    var viewPath = path.join(themePath, 'views');
    var staticAssetOptions = {
      extensions: config.data.assets
    };

    logger.debug({ options: options }, 'server; starting');

    var themeAssets = path.join(themePath, 'public');
    var dataAssets = file.abs('./data/assets');
    var contentAssets = glob.sync(file.abs('./data/' + options.content + '/**/*.html/public'));
    var componentsPaths = glob.sync(file.abs('./components/{*.js,*/index.js}'));
    var components = {};

    logger.debug({ list: componentsPaths }, 'loading components');
    componentsPaths.forEach(function(component) {
      var baseName = path.basename(component, '.js')
        , componentName;
      componentName = baseName.toLowerCase() === 'index' ? path.basename(path.dirname(component)) : baseName;
      logger.trace({ component: component, name: componentName }, 'loading');
      components[config.component.tagprefix + componentName] = require(component);
    });

    logger.debug({ port: dbPort }, 'connecting db');
    // rep = sock.connect/on message; req = sock.bind/send
    var sock = axon.socket('req');
    sock.bind(dbPort);

    [
      'close',
      'error',
      'ignored error',
      'socket error',
      'reconnect',
      'connect',
      'disconnect',
      'bind',
      'drop',
      'flush',
    ].forEach(function(evtName) {
      sock.on(evtName, _.throttle(function() {
        if (arguments[0] instanceof Error) {
          logger.warn({ err: arguments[0] }, 'db error');
        }
        else {
          logger.trace({ evt: evtName }, 'db event');
        }
      }, 1000));
    });

    var createContext = context({
        extensions: null
      , theme: null
      , viewPath: viewPath
      , themePath: themePath
      , config: config
      , env: helpers.loadEnv(config.theme.env)
      , yieldHandler: function(yieldUrl) {
          // TODO: db.request
          if (config.theme.yield) {
            console.log('URL discovered %s', yieldUrl);
          }
          else {
            logger.trace({ url: yieldUrl }, 'yield disabled');
          }
        }
      , liveReloadPort: options.livereloadport
    });

    var site = watcher.start({
        target: path.join(process.cwd(), './data/' + options.content)
      , port: dbPort
      , livereloadport: options.livereloadport
      , themePath: themePath
      , static: options.static
    }, E.bubbles(callback, function() {
      // FIXME: wrapping this in a delay for now since there isn't a clear-cut ready event being emitted
      setTimeout(function() {
        logger.info({ site: site }, 'watcher started');
        if (config.strict) {
          var locale = null; // TODO: iterate over all locales, verifying each
          var urls = site.urls(false, locale, config.data.routes != 'explicit')
            , uniqUrls = _.uniq(urls);
          if (urls.indexOf(null) > -1) {
            logger.fatal({ err: new Error('Unreachable content') });
            process.exit(1);
          }
          else if (!config.data.collisions && uniqUrls.length !== urls.length) {
            var dupes = urls.filter(function(element, index) {
              return index === urls.lastIndexOf(element) && urls.indexOf(element) !== index;
            });
            logger.debug({ list: dupes }, 'dupe routes');
            return callback(new Error('Page collisions'));
          }
        }
        callback(null, exportsObjects);
      }, 500);
    }));

    var assetCollisions = helpers.findAssetCollisions([themeAssets, dataAssets].concat(contentAssets), config.data.assets);
    if (assetCollisions.length) {
      logger.debug({ list: assetCollisions }, 'asset collisions')
      if (config.data.collisions) {
        logger.warn('Warning: There were ' + assetCollisions.length + ' assets with colliding filenames.  This could lead to incorrect images being displayed or worse');
      }
      else {
        return callback(new Error('Asset collision'));
      }
    }

    var app = express();
    app.set('port', options.port || defaultOptions.port);

    app.set('env', 'development');
    app.enable('case sensitive routing');
    app.enable('strict routing');

    // view engine setup
    app.set('views', viewPath);
    app.set('view engine', 'ejs');
    app.disable('view cache');

    app.use(express.static(themeAssets)); // theme can serve anything
    app.use(express.static(dataAssets, staticAssetOptions));
    for (var i=0; i < contentAssets.length; i++) {
      app.use(express.static(contentAssets[i], staticAssetOptions));
    }

    app.use(function(err, req, res, next) {
      helpers.renderError(req, res, createContext, { code: 500, message: err.message, originalError: err, context: null });
    });

    if (config.cli.serve.remotecontrol) {
      app.get('/__fancy__/:command', function(req, res) {
        switch (req.params.command.toLowerCase()) {
          case 'shutdown':
            logger.warn({ req: req }, 'received shutdown');
            res.end('Goodbye');
            setImmediate(process.exit);
          break;

          case 'urls':
            res.contentType('application/json').end(JSON.stringify(site.urls(false, null, config.data.routes != 'explicit'), null, 2));
          break;

          case 'snapshot':
            res.contentType('application/json').end(JSON.stringify(site.snapshot(), null, 2));
          break;

          default:
            res.end('Command not understood');
          break;
        }
      });
    }

    var router = express.Router();
    router.get('*', function(req, res, next) {
      logger.debug({ url: req.url }, 'received request');

      var locale = null;

      if (helpers.configRedirects(req, res, config.data.redirects, logger)) {
        return;
      }

      // Set current timestamp to used by compilation or whererever else
      res.set('Fancy-Compiled', new Date().getTime());

      sock.send('find', { url: req.url, locale: locale }, function(data) {
        if (!data || data.error) {
          logger.trace({ url: req.url, locale: locale, data: data }, 'find error');
          helpers.renderError(req, res, createContext, { code: data.error || 500, message: data.error.message || 'DB Error Find', originalError: null, context: null });
          return;
        }

        if (helpers.dataRedirects(req, res, data.properties, logger)) {
          return;
        }

        var context = createContext(data.filepath, data.properties, helpers.buildRequest(req), data.resources);
        context.usingResolver = helpers.usingResolver(sock);

        sendResponse(req, res, viewPath, context, components, logger, function(err) {
          if (err) {
            logger.error({ url: req.url, err: err, viewPath: viewPath }, 'unable to render');
            helpers.renderError(req, res, createContext, { code: 500, message: 'Response was not sent because rendering failed', originalError: err, context: context });
          }
        });
      });
    });
    app.use('/', router);
    app.listen(options.port, E.exits(true));

    exportsObjects.site = site;
    exportsObjects.app = app;
  }
};
