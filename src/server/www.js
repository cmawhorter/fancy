var cluster = require('cluster');

var express = require('express')
  , glob = require('glob');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , file = require('../utils/file.js');

var helpers = require('./www/helpers.js');

module.exports = {
  start: function(options) {
    options = options || {};

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
      app.set('views', file.abs('./themes/' + options.theme + '/views'));
      app.set('view engine', 'ejs');
      app.disable('view cache');

      helpers.addStaticRoute(app, './themes/' + options.theme + '/public');
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
        res.status(200).contentType('text/plain').send('hello from ' + process.pid + '.');
        // fancy.requestPage(req.url, function(err, details) {
        //   if (err) {
        //     helpers.renderError(req, res, err);
        //     return;
        //   }

        //   fancy.routeDiscovered(req.url);
        //   var contentType = details.res.page.contentType || 'text/html';
        //   if (contentType.indexOf(';') > -1) {
        //     contentType = contentType.split(';')[0].trim();
        //   }

        //   if (contentType == 'application/json') {
        //     res.json(details.res.page.body);
        //     return;
        //   }
        //   else if (contentType == 'application/javascript') {
        //     var jsVar = details.res.page.scopeTarget || 'window["' + req.url + '"]';
        //     res.status(200).contentType('application/javascript').send(jsVar + ' = ' + JSON.stringify(details.res.page.body));
        //     return;
        //   }
        //   else {
        //     res.render('layouts/' + details.layout, details.res);
        //     return;
        //   }
        // });
      });
      app.use('/', router);
      app.listen(options.port, E.exits(true));
    }
  }
};
