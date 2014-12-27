var express = require('express');
var path = require('path');
var logger = require('morgan');

var express = require('express');


module.exports = function(workingDir) {
  var app = express();
  var router = require('./router')(workingDir);

  app.set('env', 'development');
  app.enable('case sensitive routing');
  app.enable('strict routing');

  // view engine setup
  app.set('views', path.join(workingDir, './themes/blah/views'));
  app.set('view engine', 'ejs');
  app.disable('view cache');

  app.use(logger('dev'));
  app.use(express.static(path.join(workingDir, './themes/blah/public')));

  app.use('/', router);

  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('layouts/error', {
        message: err.message
      , error: err
      , models: {}
      , site: {}
      , page: {}
    });
  });

  return app;
};
