var fs = require('fs')
  , path = require('path');

var express = require('express')
  , glob = require('glob')
  , yaml = require('js-yaml')
  , moment = require('moment')
  , cheerio = require('cheerio')
  , urlPattern = require('url-pattern');

var db, fancy, models, site, relationships, $;

// TODO: passed in from fancy
models = {};
pages = {};
relationships = {};


var arrayKeys = [ 'keywords' ];
glob.sync('**/*.html').forEach(function(f) {
  $ = cheerio.load(fs.readFileSync(path.join(process.cwd(), f)));

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

  pages[props.url] = props;

  var model = $('meta[name="model"]').attr('content');
  if (model) {
    if (!models[model]) models[model] = {};
    models[model][props.url] = props;
  }
});

// console.log(pages); process.exit();

// var db = require(path.join(process.cwd(), './.fancy/db/'));

try {
  // TODO: iterate over settings files and and load them into keys based on their file name.  e.g. site.yml loads to { site: yml contents }
  site = yaml.load(fs.readFileSync(path.join(process.cwd(), './www/data/settings/site.yml'), 'utf8'));
} catch (err) {
  console.error(err);
}

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
// parsley(fs.createReadStream(path.join(process.cwd(), './www/data/content/article1.html')), function (req) {
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
    return page;
  }
  else {
    for (var k in pages) {
      var params = urlPattern.newPattern(k).match(url);
      console.log(url, k, params);
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

  res.render('layouts/' + layout, {
      fancy: fancy
    , models: models || {}
    , site: site || {}
    , page: page || {}
    , relationships: relationships || {}
    , moment: moment
  });
});

module.exports = router;
