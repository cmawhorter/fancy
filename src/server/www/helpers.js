var fs = require('fs')
  , path = require('path')
  , url = require('url')
  , cluster = require('cluster');

var express = require('express')
  , glob = require('glob')
  , _ = require('lodash');

var Properties = require('../../data/properties.js');

var file = require('../../utils/file.js')
  , tell = require('../../utils/tell.js')
  , i18n = require('../../utils/i18n.js')
  , log = require('../../utils/log.js');

var dbClient;

var helpers = module.exports = {
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

  configRedirects: function(req, res, redirects, logger) {
    for (var route in redirects) {
      var re = new RegExp(route);
      logger.trace({ url: req.url, re: re.toString() }, 'testing url for redirects');
      if (route === req.url || re.test(req.url)) {
        var val = redirects[route];
        var redirectUrl = req.url.replace(re, val);
        logger.trace({ url: req.url, re: re.toString(), replace: val, redirect: redirectUrl }, 'redirect matched');
        logger.debug({ url: req.url, redirect: redirectUrl }, 'config redirect');
        res.redirect(301, redirectUrl);
        return true;
      }
    }
    return false;
  },

  dataRedirects: function(req, res, properties, logger) {
    if (properties['redirect']) {
      logger.debug({ url: req.url, redirect: properties['redirect'][0] }, 'data redirect (perm)');
      res.redirect(301, properties['redirect'][0]);
      return true;
    }
    else if (properties['temporary-redirect']) {
      logger.debug({ url: req.url, redirect: properties['temporary-redirect'][0] }, 'data redirect (temp)');
      res.redirect(302, properties['temporary-redirect'][0]);
      return true;
    }
    else if (properties['route-redirect']) {
      logger.trace({ url: req.url, list: properties['route-redirect'] }, 'route redirects found');
      for (var i=0; i < properties['route-redirect'].length; i++) {
        var routeRedirect = properties['route-redirect'][i]
          , re = new RegExp(routeRedirect);
        if (routeRedirect === req.url || re.test(req.url)) {
          logger.debug({ url: req.url, redirect: routeRedirect, redirect: properties['route'][0] }, 'route redirect');
          res.redirect(301, properties['route'][0]);
          return true;
        }
      }
      logger.trace({ url: req.url }, 'route redirects -> none matched');
    }
    return false;
  },

  renderError: function(req, res, createContext, error) {
    var fakePath = '__error__';
    var data = {};
    data[i18n.GLOBAL] = [
      [ 'route', req.url ],
      [ 'error', error ],
    ];
    var context = createContext(fakePath, Properties.create(fakePath, data).getAsHash(), helpers.buildRequest(req), null);
    res.status(error.code).render('layouts/error', context);
  },

  usingResolver: function(sock) {
    return function usingResolver(using, taskCallback) {
      var obj = { key: using.key };
      if (typeof using.value === 'function') {
        obj.fn = using.value.toString();
      }
      else {
        obj.value = using.value;
      }
      sock.send('matching', obj, function(data) {
        using.result.retrieved = data.pages;
        taskCallback();
      });
    }
  },

  gatherAssets: function(assetPaths, extensions, unlimited) {
    var allAssets = []
      , uniqueRelativeAssets = [];
    for (var i=0; i < assetPaths.length; i++) {
      var pattern = unlimited && assetPaths[i].indexOf(unlimited) > -1 ? '/**/*.*' : '/**/*.@(' + extensions.join('|') + ')';
      var search = path.join(assetPaths[i], pattern);
      glob.sync(search).forEach(function(element) {
        var rel = element.split(assetPaths[i])[1]
          , item = { abs: element, rel: rel, collision: null };
        if (uniqueRelativeAssets.indexOf(rel) > -1) {
          item.collision = true;
        }
        else {
          item.collision = false;
          uniqueRelativeAssets.push(rel);
        }
        allAssets.push(item);
      });
    }
    return allAssets;
  },

  findAssetCollisions: function(assetPaths, extensions) {
    var allAssets = module.exports.gatherAssets(assetPaths, extensions);
    return allAssets.filter(function(element) {
      return element.collision === true;
    }).map(function(element) {
      return element.rel;
    });
  }
};

