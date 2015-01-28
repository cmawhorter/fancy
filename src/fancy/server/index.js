var fs = require('fs');

var express = require('express');
var path = require('path');
var logger = require('morgan');

var express = require('express');

var glob = require('glob');


process.on('uncaughtException', function(err) {
  console.error('Error', err.stack);
});

// FIXME: callback -> ready event

// this is sync but let's keep the async signature the rest have
module.exports = function(fancy, callback) {
  var app = express()

  app.set('env', 'development');
  app.enable('case sensitive routing');
  app.enable('strict routing');

  // view engine setup
  app.set('views', path.join(process.cwd(), './themes/' + fancy.options.theme + '/views'));
  app.set('view engine', 'ejs');
  app.disable('view cache');

  app.use(logger('dev'));
  app.use(express.static(path.join(process.cwd(), './themes/' + fancy.options.theme + '/public')));
  app.use(express.static(path.join(process.cwd(), './data/assets')));

  // initialize static handlers
  // TODO: support multiple content directories
  var matches = glob.sync('./data/content/**/*.html/public');
  for (var i=0; i < matches.length; i++) {
    app.use(express.static(path.join(process.cwd(), matches[i])));
  }

  app.set('views', path.join(process.cwd(), './themes/' + fancy.options.theme + '/views'));

  function renderError(req, res, err) {
    res.status(err.status || 500);
    res.render('layouts/error', fancy.createResponse(req.url, {
        message: err.message
      , error: err
      , route: req.url
    }));
  }

  app.use(function(err, req, res, next) {
    renderError(req, res, err);
  });

  var router = express.Router();
  router.get('*', function(req, res, next) {
    console.log('Looking up page for %s...', req.url);

    fancy.requestPage(req.url, function(err, details) {
      if (err) {
        renderError(req, res, err);
        return;
      }

      fancy.routeDiscovered(req.url);
      var contentType = details.res.page.contentType || 'text/html';

      if (contentType.split(';')[0].trim() == 'text/html') {
        res.render('layouts/' + details.layout, details.res);
      }
      else if (contentType == 'application/json') {
        res.json(details.res.page.body);
        return;
      }
      else {
        renderError(req, res, new Error('Invalid content type: ' + contentType));
        return;
      }
    });
  });
  app.use('/', router);

  callback(null, app);
};
