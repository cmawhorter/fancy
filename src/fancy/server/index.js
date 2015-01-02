var express = require('express');
var path = require('path');
var logger = require('morgan');

var express = require('express');

// FIXME: callback -> ready event

// this is sync but let's keep the async signature the rest have
module.exports = function(fancy, callback) {
  var app = express();

  app.set('env', 'development');
  app.enable('case sensitive routing');
  app.enable('strict routing');

  // view engine setup
  app.set('views', path.join(process.cwd(), './themes/' + fancy.options.theme + '/views'));
  app.set('view engine', 'ejs');
  app.disable('view cache');

  app.use(logger('dev'));
  app.use(express.static(path.join(process.cwd(), './themes/' + fancy.options.theme + '/public')));

  function renderError(req, res, err) {
    res.status(err.status || 500);
    res.render('layouts/error', {
        message: err.message
      , error: err
    });
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
      console.log('Rendering %s with locals: ', 'layouts/' + details.layout, details.res);
      res.render('layouts/' + details.layout, details.res);
    });
  });
  app.use('/', router);

  callback(null, app);
};
