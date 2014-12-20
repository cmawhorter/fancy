var express = require('express');
var path = require('path');
var logger = require('morgan');

var express = require('express');

var router = require('./router.js');
var app = express();

app.set('env', 'development');
app.enable('case sensitive routing');
app.enable('strict routing');

// view engine setup
app.set('views', path.join(process.cwd(), './www/themes/blah/views'));
app.set('view engine', 'ejs');
app.disable('view cache');

app.use(logger('dev'));
app.use(express.static(path.join(process.cwd(), './www/themes/blah/public')));

app.use('/', router);

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('layouts/error', {
      message: err.message
    , error: err
    , site: {}
    , page: {}
  });
});

module.exports = app;
