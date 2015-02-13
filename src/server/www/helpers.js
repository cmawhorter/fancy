var fs = require('fs')
  , url = require('url')
  , cluster = require('cluster');

var express = require('express')
  , messenger = require('messenger');

var file = require('../../utils/file.js');

var dbClient;

module.exports = {
  loadPackage: function(fancyGlobals) {
    var json;
    try {
      json = JSON.parse(fs.readFileSync('./package.json'));
    }
    catch (e) {
      console.warn(e.message);
    }
    fancyGlobals.config = ((json || {}).fancy) || {};
  },

  loadEnv: function(fancyGlobals) {
    var passEnvVars = fancyGlobals.config.env || { stage: ['NODE_ENV', 'production'] };
    for (var k in passEnvVars) {
      var envVal = passEnvVars[k];
      fancyGlobals.env[k] = process.env[envVal[0]] || envVal[1];
    }
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

  db: function(port) {
    dbClient = dbClient || messenger.createSpeaker(port)
    return dbClient;
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

