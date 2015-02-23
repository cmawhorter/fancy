var fs = require('fs')
  , path = require('path')
  , url = require('url')
  , cluster = require('cluster');

var express = require('express')
  , glob = require('glob');

var file = require('../../utils/file.js')
  , tell = require('../../utils/tell.js')
  , log = require('../../utils/log.js');

var dbClient;

module.exports = {
  loadEnv: function(configEnv) {
    var passEnvVars = configEnv;
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

  renderError: function renderError(req, res, err) {
    res.status(err.status || 500);
    res.contentType('text/plain').send('Error ' + err.status + ': ' + err.message);
  },

  route404: function route404(req, res) {
    res.status(404).contentType('text/plain').send('Error 404: File not found');
  },

  findAssetCollisions: function(assetPaths, extensions) {
    var uniqueRelativeAssets = []
      , collisions = [];
    for (var i=0; i < assetPaths.length; i++) {
      var search = path.join(assetPaths[i], '/**/*.@(' + extensions.join('|') + ')');
      glob.sync(search).forEach(function(element) {
        var rel = element.split(assetPaths[i])[1];
        if (uniqueRelativeAssets.indexOf(rel) > -1) {
          collisions.push(element);
        }
        else {
          uniqueRelativeAssets.push(rel);
        }
      });
    }
    return collisions;
  }
};

