var fs = require('fs')
  , path = require('path');

var express = require('express')
  , yaml = require('js-yaml');

var db, fancy, models, site;

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
  }
}


// TODO: passed in from fancy
models = {
  articles: []
};


var parsley = require('parsley');
parsley(fs.createReadStream(path.join(process.cwd(), './www/data/content/article1.html')), function (req) {
  var head = [];
  req.on('rawHead', function (buf) {
    head.push(buf);
  });

  var body = [];
  req.on('rawBody', function (buf) {
    body.push(buf);
  });

  req.on('error', function(err) {
    throw err;
  });

  req.on('end', function () {
    console.dir(head.map(String));
    console.dir(body.map(String));
    models.articles.push({
        title: head['x-fancy-model-title']
      , postedDate: head['x-fancy-model-posteddate']
      , author: head['x-fancy-model-author']
      , body: body
    });

    console.log(models.articles);
    process.exit();
  });
});

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
