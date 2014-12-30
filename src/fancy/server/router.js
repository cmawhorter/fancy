var fs = require('fs')
  , path = require('path');

var express = require('express')
  , glob = require('glob')
  , yaml = require('js-yaml')
  , moment = require('moment')
  , async = require('async')
  , cheerio = require('cheerio')
  , uriTemplates = require('uri-templates')
  , urlPattern = require('url-pattern');


var help = require('../../utils/help');

module.exports = function(fancy) {
  var cwd = fancy.options.cwd;
  var db, plugins, resources, site, relationships, $;

  // TODO: passed in from fancy
  plugins = {};
  resources = {};
  pages = {};
  relationships = {};

  try {
    // TODO: iterate over settings files and and load them into keys based on their file name.  e.g. site.yml loads to { site: yml contents } -- with care taken for reserved
    site = yaml.load(fs.readFileSync(path.join(cwd, './data/settings/site.yml'), 'utf8'));
  } catch (err) {
    console.error(err);
  }

  // load site config plugins included via pkg manage
  // TODO: replace site.plugins with package.json matching.  auto install any dep starting with fancy-?
  (site.plugins || []).forEach(function(plugin) {
    plugins[plugin] = require(plugin);
  });

  fs.readdirSync(path.join(cwd, 'plugins')).forEach(function(raw) {
    if (/\.js$/.test(raw)) {
      var plugin = raw.replace(/\.[\w\d]+$/, '').trim();
      plugins[plugin] = require(path.join(cwd, 'plugins/' + raw));
    }
  });

  var router = express.Router();
  router.get('*', function(req, res, next) {
    console.log('Looking up page for ' + req.url);
    var page = fancy.getPage(req.url)
      , layout = 'primary';

    if (page) {
      layout = page.layout;
    }
    else {
      var err = new Error('Not Found');
      err.status = 404;
      return next(err);
    }

    page.url = req.url;
    page.relative = function(mergeVals) {
      if (!page.urlTemplate) return page.url;

      var templateValues = Object.create(page.params);
      for (var k in mergeVals) {
        templateValues[k] = mergeVals[k];
      }

      var templateUrl = page.urlTemplate;
      if ('/' !== templateUrl.trim()[0] && /\s*\w.*\?.*\:.*/.test(templateUrl)) { // conditional, eval it
        console.log('url template needs eval', templateUrl);
        templateUrl = (function(template, context) {
          return eval(templateUrl);
        })(templateValues, { site: site, page: page });
      }

      console.log('url template is', templateUrl);

      var url = uriTemplates(templateUrl).fillFromObject(templateValues);
      // console.log('URI', page.urlTemplate || page.route, url);

      return url;
    };

    site = site || {};
    site.resources = fancy.db.cache.resources || {};
    site.pages = fancy.db.cache.pages;
    site.relationships = fancy.db.cache.relationships || {};

    res.render('layouts/' + layout, {
        fancy: {
          // takes a single k/v dict and returns the parts for easy use
          each: function(obj, callback) {
            if (obj) {
              var k = Object.keys(obj)[0];
              callback(k, obj[k]);
            }
            else {
              callback();
            }
          },

          forEach: function(obj, callback) {
            for (var k in obj) {
              callback(obj[k], k);
            }
          },

          once: function(key, fn) {
            // TODO: stub. fn gets exec once and the result cached under key.  runs once per build.
          }
        }
      , site: site
      , page: page || {}
      , plugins: {
          pagination: require('../../../examples/pagination-plugin/pagination.js')
        }
      , moment: moment
    });
  });

  return router;
};
