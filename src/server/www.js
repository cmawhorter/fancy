var path = require('path')
  , cluster = require('cluster');

var express = require('express')
  , glob = require('glob');

var watcher = require('./watcher.js')
  , context = require('../data/context.js');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , file = require('../utils/file.js')
  , helpers = require('./www/helpers.js');

module.exports = {
  start: function(options) {
    options = options || {};
    var dbPort = options.port + 1;
    var db = helpers.db(dbPort);
    var theme = './' + (options.theme ? 'themes/' + options.theme : 'theme');
    var viewPath = file.abs(theme + '/views');

    var config = helpers.loadPackage();
    var createContext = context({
        extensions: null
      , theme: null
      , viewPath: viewPath
      , config: config
      , env: helpers.loadEnv(config.env)
      , yieldHandler: function(yieldUrl) {
          // TODO: db.request
          console.log('URL discovered %s', yieldUrl);
        }
    });

    if (!options.workers || cluster.isMaster) {
      watcher.start({
          target: './data/' + options.content
        , port: dbPort
      });
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

      helpers.addStaticRoute(app, theme + '/public');
      helpers.addStaticRoute(app, './data/assets');

      var matches = glob.sync(file.abs('./data/' + options.content + '/**/*.html/public'));
      for (var i=0; i < matches.length; i++) {
        helpers.addStaticRoute(app, matches[i]);
      }

      app.use(function(err, req, res, next) {
        helpers.renderError(req, res, err);
      });

      // TODO: ? implement staged content so that robots can be conditionally supplied via content directory
      app.get('/robots.txt', helpers.robotsRoute);
      app.get('/favicon.ico', helpers.route404);

      var router = express.Router();
      router.get('*', function(req, res, next) {
        tell('request handled', process.pid, Math.random(), req.url);
        // res.status(200).contentType('text/plain').send('hello from ' + process.pid + '.');

        db.request('find', { url: req.url, locale: null }, function(data) {
          if (!data || !data.result || data.result.error) {
            console.log('not found in db');
            return helpers.renderError(req, res, new Error(data.result.error));
          }

          console.log('Found', data);

          var context = createContext(data.result.filepath, data.result.page, helpers.buildRequest(req), data.result.resources);

          var contentType = context.page.text('contenttype', 'text/html')
            , body = context.page.first('body');

          if (contentType.indexOf(';') > -1) {
            contentType = contentType.split(';')[0].trim();
          }

          if (contentType == 'application/json') {
            res.json(body);
            return;
          }
          else if (contentType == 'application/javascript') {
            var jsVar = context.page.text('scopetarget', 'window["' + req.url + '"]');
            res.status(200).contentType('application/javascript').send(jsVar + ' = ' + JSON.stringify(body));
            return;
          }
          else {
            res.render('layouts/' + context.page.first('layout', 'primary'), context);
            return;
          }
        });
      });
      app.use('/', router);
      app.listen(options.port, E.exits(true));
    }
  }
};
