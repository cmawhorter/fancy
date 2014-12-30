var express = require('express');
var path = require('path');
var logger = require('morgan');

var express = require('express');

// this is sync but let's keep the async signature the rest have
module.exports = function(fancy, callback) {
  var app = express();
  var router = require('./router')(fancy.options.cwd);

  app.set('env', 'development');
  app.enable('case sensitive routing');
  app.enable('strict routing');

  // view engine setup
  app.set('views', path.join(fancy.options.cwd, './themes/' + fancy.options.theme + '/views'));
  app.set('view engine', 'ejs');
  app.disable('view cache');

  app.use(logger('dev'));
  app.use(express.static(path.join(fancy.options.cwd, './themes/' + fancy.options.theme + '/public')));

  app.use('/', router);

  // FIXME: verify theme is structured correctly
  // TODO: maybe standardize theme structure and create a versioned library around it?

  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('layouts/error', {
        message: err.message
      , error: err
    });
  });

  callback(null, app);
};
