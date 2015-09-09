var fs = require('fs')
  , path = require('path');

var express = require('express')
  , logger = require('morgan')
  , express = require('express')
  , glob = require('glob');

var cluster = require('cluster');

process.on('uncaughtException', function(err) {
  console.error('Error', err.stack);
});

// FIXME: callback -> ready event

// this is sync but let's keep the async signature the rest have
module.exports = function(fancy, callback) {
  if (fancy.options.concurrency && cluster.isMaster) {
    function messageHandler(msg) {
      if (msg.cmd && msg.cmd == 'routeDiscovered') {
        fancy.routeDiscovered(msg.url);
      }
    }

    for (var i = 0; i < fancy.options.concurrency; i++) {
      cluster.fork().on('message', messageHandler);
    }

    cluster.on('online', function(worker) {
      console.log('[%s] worker online', worker.process.pid);
    });

    cluster.on('exit', function(worker, code, signal) {
      console.log('[%s] worker ded', worker.process.pid);
      cluster.fork().on('message', messageHandler);
    });
  } else {
    var app = express();

    if (fancy.options.concurrency) {
      // wrap fancy.routeDiscovered in the worker to aggregate urls in master
      var _routeDiscovered = fancy.routeDiscovered;
      fancy.routeDiscovered = function(url) {
        process.send({
          cmd: 'routeDiscovered',
          url: url
        });
        return _routeDiscovered.apply(this, arguments);
      }
    }

    app.set('env', 'development');
    app.enable('case sensitive routing');
    app.enable('strict routing');

    // view engine setup
    app.set('views', path.join(process.cwd(), './themes/' + fancy.options.theme + '/views'));
    app.set('view engine', 'ejs');
    app.disable('view cache');

    app.use(express.static(path.join(process.cwd(), './themes/' + fancy.options.theme + '/public')));
    app.use(express.static(path.join(process.cwd(), './data/assets')));

    // initialize static handlers
    // TODO: support multiple content directories
    var matches = glob.sync('./data/content/**/*.html/public');
    for (var i=0; i < matches.length; i++) {
      app.use(express.static(path.join(process.cwd(), matches[i])));
    }

    app.use(logger('dev'));

    app.set('views', path.join(process.cwd(), './themes/' + fancy.options.theme + '/views'));

    function renderError(req, res, err) {
      res.status(err.status || 500);
      res.render('layouts/error', fancy.createResponse(req.url, {
          message: err.message
        , error: err
        , route: req.url
      }));
    }

    function renderPage(req, res, details, next) {
      fancy.routeDiscovered(req.url);
      var contentType = details.res.page.contentType || 'text/html';
      if (contentType.indexOf(';') > -1) {
        contentType = contentType.split(';')[0].trim();
      }

      if (contentType == 'application/json') {
        res.json(details.res.page.body);
        return;
      }
      else if (contentType == 'application/javascript') {
        var jsVar = details.res.page.scopeTarget || 'window["' + req.url + '"]';
        res.status(200).contentType('application/javascript').send(jsVar + ' = ' + JSON.stringify(details.res.page.body));
        return;
      }
      else {
        res.render('layouts/' + details.layout, details.res);
        return;
      }
    }

    // TODO: implement staged content so that robots can be conditionally supplied via content directory
    app.use('/robots.txt', function(req, res) {
      res.status(200).contentType('text/plain').send([ 'User-agent: *', 'Disallow: /' ].join('\n'));
    });

    var router = express.Router();
    router.get('*', function(req, res, next) {
      fancy.requestPage(req.url, function(err, details) {
        if (err) {
          if (req.url.indexOf('?') > -1) { // has querystring?
            // drop it and try matching
            fancy.requestPage(req.url.split('?')[0], function(err, details) {
              if (err) {
                renderError(req, res, err);
                return;
              }
              renderPage(res, res, details, next);
            });
          }
          else {
            renderError(req, res, err);
          }
          return;
        }

        renderPage(res, res, details, next);
      });
    });
    app.use('/', router);

    app.use(function(err, req, res, next) {
      renderError(req, res, err);
    });

    app.set('port', fancy.options.port);
    app.listen(fancy.options.port, function(err) {
      if (err) throw err;
    });
  }

  callback(null);
};
