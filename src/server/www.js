var path = require('path')
  , fs = require('fs')
  , cluster = require('cluster');

var express = require('express')
  , axon = require('axon')
  , ejs = require('ejs')
  , glob = require('glob');

var watcher = require('./watcher.js')
  , context = require('../data/context.js');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , file = require('../utils/file.js')
  , helpers = require('./www/helpers.js');

module.exports = {
  start: function(options, callback) {
    options = options || {};
    options.lrPort = options.lrPort || 35729;
    var dbPort = options.port + 1;
    var themePath = './' + (options.theme ? 'themes/' + options.theme : 'theme');
    var viewPath = file.abs(themePath + '/views');

    var sock = axon.socket('req');
    sock.bind(dbPort);

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
      , liveReloadPort: options.lrPort
    });

    if (!options.workers || cluster.isMaster) {
      watcher.start({
          target: './data/' + options.content
        , port: dbPort
        , lrPort: options.lrPort
        , themePath: themePath
      }, callback);
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


      helpers.addStaticRoute(app, path.join(themePath, 'public'));
      helpers.addStaticRoute(app, './data/assets');

      var matches = glob.sync(file.abs('./data/' + options.content + '/**/*.html/public'));
      for (var i=0; i < matches.length; i++) {
        helpers.addStaticRoute(app, matches[i]);
      }

      app.use(function(err, req, res, next) {
        helpers.renderError(req, res, err);
      });

      var router = express.Router();
      router.get('*', function(req, res, next) {
        tell('request handled', process.pid, Math.random(), req.url);
        // res.status(200).contentType('text/plain').send('hello from ' + process.pid + '.');

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

          console.log('www (contenttype) => %s', contentType);

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
