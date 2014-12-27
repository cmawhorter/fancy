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

var URITemplate = require('URIjs/src/URITemplate');

module.exports = function(workingDir) {
  var db, fancy, plugins, resources, site, relationships, $;

  // TODO: passed in from fancy
  plugins = {};
  resources = {};
  pages = {};
  relationships = {};

  try {
    // TODO: iterate over settings files and and load them into keys based on their file name.  e.g. site.yml loads to { site: yml contents } -- with care taken for reserved
    site = yaml.load(fs.readFileSync(path.join(workingDir, './data/settings/site.yml'), 'utf8'));
  } catch (err) {
    console.error(err);
  }

  // load site config plugins included via pkg manage
  // TODO: replace site.plugins with package.json matching.  auto install any dep starting with fancy-?
  (site.plugins || []).forEach(function(plugin) {
    plugins[plugin] = require(plugin);
  });

  fs.readdirSync(path.join(workingDir, 'plugins')).forEach(function(raw) {
    if (/\.js$/.test(raw)) {
      var plugin = raw.replace(/\.[\w\d]+$/, '').trim();
      plugins[plugin] = require(path.join(workingDir, 'plugins/' + raw));
    }
  })

  var arrayKeys = [ 'keywords' ];
  glob.sync('**/*.html', { cwd: workingDir }).forEach(function(f) {
    $ = cheerio.load(fs.readFileSync(path.join(workingDir, f)));

    var props = {}
      , output = [];

    function addProp(name, val) {
      if (name) {

        if (!relationships[name]) relationships[name] = {};
        if (!relationships[name][val]) relationships[name][val] = [];
        relationships[name][val].push(props);

        if (props[name]) {
          if ('object' !== typeof props[name] || !('length' in props[name])) {
            props[name] = [ props[name] ];
          }
          props[name].push(val);
        }
        else {
          props[name] = val;
        }
      }
    }

    $('meta').each(function() {
      var $el = $(this)
        , name = $el.attr('name')
        , val = $el.attr('content') || '';

      if (~arrayKeys.indexOf(name)) {
        val = val.split(/\s*,\s*/g);
        val.forEach(function(v) {
          addProp(name, v);
        });
      }
      else {
        addProp(name, val);
      }
    });

    props.title = $('title').text() || '';
    props.contentType = 'text/html; charset=utf-8';
    $('meta[http-equiv][content]').each(function() {
      var $this = $(this);
      if ($this.attr('http-equiv').toLowerCase() === 'content-type') {
        props.contentType = $this.attr('content');
      }
    });

    // $('link[rel="alternate"]').each(function() {
    //   var $el = $(this);
    //   output.push({
    //       type: ($el.attr('type') || '').toLowerCase()
    //     , title: ($el.attr('title') || '').toLowerCase()
    //     , href: ($el.attr('href') || '').toLowerCase()
    //   });
    // });

    props.body = $('body').html();

    pages[props.route] = props;

    var resource = $('meta[name="resource"]').attr('content');
    if (resource) {
      if (!resources[resource]) resources[resource] = {};
      resources[resource][props.route] = props;
    }
  });

  // console.log(pages); process.exit();

  // var db = require(path.join(workingDir, './.fancy/db/'));


  // TODO: custom helpers.  move this someplace
  fancy = {
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

  // var parsley = require('parsley');
  // parsley(fs.createReadStream(path.join(workingDir, './data/content/article1.html')), function (req) {
  //   var head = [];
  //   req.on('rawHead', function (buf) {
  //     head.push(buf);
  //   });

  //   var body = [];
  //   req.on('rawBody', function (buf) {
  //     body.push(buf);
  //   });

  //   req.on('error', function(err) {
  //     throw err;
  //   });

  //   req.on('end', function () {
  //     console.dir(head.map(String));
  //     console.dir(body.map(String));
  //     models.articles.push({
  //         title: head['x-fancy-model-title']
  //       , postedDate: head['x-fancy-model-posteddate']
  //       , author: head['x-fancy-model-author']
  //       , body: body
  //     });

  //     console.log(models.articles);
  //     process.exit();
  //   });
  // });

  function matchPage(url) {
    var page = pages[url];
    if (page) {
      page.params = {};
      return page;
    }
    else {
      for (var k in pages) {
        var params = urlPattern.newPattern(k).match(url);
        // console.log(url, k, params);
        if (params) {
          page = Object.create(pages[k]);
          page.params = params;
          return page;
        }
      }
    }
  }

  var router = express.Router();
  router.get('*', function(req, res, next) {
    console.log('Looking up page for ' + req.url);
    var page = matchPage(req.url)
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

      var templateValues = Object.create(page);
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

    var tasks = [];
    tasks.push(function(taskCallback) {
      setTimeout(taskCallback, 0);
    });

    site = site || {};
    site.resources = resources || {};
    site.pages = pages;
    site.relationships = relationships || {};

    res.render('layouts/' + layout, {
        fancy: fancy
      , site: site
      , page: page || {}
      , plugins: {
          pagination: function(collection, options, callback) {
            console.log('Pagination plugin');
            var pageStart = parseInt(options.pageStart, 10) || 0;
            var pageLimit = parseInt(options.pageLimit, 10) || 10;

            var start = pageStart * pageLimit;
            var stop = start + pageLimit;

            // console.log('collection len', collection.length, 'pageStart', pageStart, 'pageLimit', pageLimit);

            var getColKey = 'length' in collection ? function(index) { return index; } : function(index) { return Object.keys(collection)[index]; };
            var colLen = 'length' in collection ? collection.length : Object.keys(collection).length;

            for (var i=start; i < colLen && i < stop; i++) {
              var item = collection[getColKey(i)];
              // console.log('iterating', item);
              callback(item);
            }

            var previous = pageStart - 1
              , next = pageStart + 1;

            if (next >= Math.ceil(colLen / pageLimit)) {
              next = null;
            }

            if (previous < 1) {
              previous = null;
            }

            return {
                current: pageStart
              , previous: previous
              , next: next
            };
          }
        }
      , moment: moment
    });
  });

  return router;
};
