var fs = require('fs')
  , url = require('url')
  , cluster = require('cluster');

var express = require('express');

var file = require('../../utils/file.js');

var dbClient;

module.exports = {
  loadEnv: function(configEnv) {
    var passEnvVars = configEnv || { stage: ['NODE_ENV', 'production'] };
    var obj = {};
    for (var k in passEnvVars) {
      var envVal = passEnvVars[k];
      obj[k] = process.env[envVal[0]] || envVal[1];
    }
    return obj;
  },

  buildRequest: function(req) {
    var parsedUrl = url.parse(req.url, true);
    return {
        url: req.url
      , params: {}
      , query: parsedUrl.query
      , locale: req.locale || 'en-US' // TODO: extract locale from request
    };
  },

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

