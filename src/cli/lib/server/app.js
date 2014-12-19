var express = require('express');
var path = require('path');
var logger = require('morgan');

var express = require('express');

var router = require('./router.js');
var app = express();

// view engine setup
app.set('views', path.join(process.cwd(), './www/themes/blah/views'));
app.set('view engine', 'hjs');

app.use(logger('dev'));
app.use(express.static(path.join(process.cwd(), './www/themes/blah/public')));

app.use('/', router);

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});

module.exports = app;
