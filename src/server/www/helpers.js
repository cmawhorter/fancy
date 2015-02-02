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
    res.contentType('text/plain').send('Error ' + err.status + ': ' + err.message);
  },

  route404: function route404(req, res) {
    res.status(404).contentType('text/plain').send('Error 404: File not found');
  }
};

