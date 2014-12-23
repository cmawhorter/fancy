var fs = require('fs')
  , path = require('path');

var express = require('express')
  , yaml = require('js-yaml')
  , cheerio = require('cheerio');

var db, fancy, models, site, $;

// TODO: passed in from fancy
models = {};


[
    './www/data/content/article1.html'
  , './www/data/content/article2.html'
  , './www/data/content/article3.html'
].forEach(function(f) {
  $ = cheerio.load(fs.readFileSync(path.join(process.cwd(), f)));

  var props = {}
    , output = [];

  $('meta').each(function() {
    var $el = $(this)
      , name = $el.attr('name')
      , val = $el.attr('content') || '';
    if (name) {
      if (props[name]) {
        if ('object' !== typeof props[name] || !('length' in props[name])) {
          props[name] = [ props[name] ];
        }
        props[name].push(val);
      }
      else {
        props[$el.attr('name')] = $el.attr('content') || '';
      }
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

  var model = $('meta[name="model"]').attr('content');
  if (model) {
    if (!models[model]) models[model] = {};
    models[model][props.url] = props;
  }
});

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

var router = express.Router();
router.get('*', function(req, res) {
  res.render('layouts/list', {
      title: 'Express'
    , fancy: fancy
    , site: site || {}
    , models: models
    , page: {}
  });
});

module.exports = router;
