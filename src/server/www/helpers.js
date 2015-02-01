var cluster = require('cluster');
var express = require('express');

var file = require('../../utils/file.js');

module.exports = {
  fork: function() {
    return cluster.fork();
  },

  robotsRoute: function(req, res) {
    res.status(200)
      .contentType('text/plain')
      .send('User-agent: *\nDisallow: /');
  },

  addStaticRoute: function addStaticRoute(app, relative) {
    app.use(express.static(file.abs(relative)));
  },

  renderError: function renderError(req, res, err) {
    res.status(err.status || 500);
    res.render('layouts/error', {});
  }
};

