var fs = require('fs')
  , path = require('path');

var cheerio = require('cheerio');
var request = require('request');

var cache = require('../fancy/index.js').cache;

var _cache = {};
function get(urlPath, callback) {
  // if (_cache[urlPath]) return callback(null, _cache[urlPath]);
  // var cacheKey = 'fancy:compile:' + urlPath;
  // cache.io(cacheKey, function(err, data) {
  //   if (err) {
  //     return callback(err);
  //   }
  //   if (data) {
  //     return callback(null, data);
  //   }
  //   else {
      workers.crawler.client.get(urlPath, function(err, req, res, data) {
        if (err) {
          console.log('Error for %s', urlPath);
          console.log(arguments);
          console.log(err);
          process.exit();
          throw err;
        }
        _cache[urlPath] = data;
        cache.io(cacheKey, _cache[urlPath], function() {
          callback(null, _cache[urlPath]);
        });
      });
      return;
  //   }
  // });
}

var workers = {
  endpoint: 'localhost:3000',
  crawler: function(task, callback) {
    // workers.crawler.client = workers.crawler.client || restify.createClient({
    //   url: 'http://' + workers.endpoint,
    //   connectTimeout: 1000,
    //   requestTimeout: 3000,
    //   headers: {
    //     'accept': '*'
    //   }
    // });
    // console.log('worker.crawler %s', task.route);
    // // get(task.route, function(err, data) {
    // //   callback(err, task.data = data);
    // // });

    callback(null, request('http://' + workers.endpoint + task.route));

    // workers.crawler.client.get(task.route, callback);
      // function(err, req) {
      // req.on('result', function(err, res) {
      //   assert.ifError(err); // HTTP status code >= 400

      //   res.body = '';
      //   res.setEncoding('utf8');
      //   res.on('data', function(chunk) {
      //     res.body += chunk;
      //   });

      //   res.on('end', function() {
      //     console.log(body);
      //   });
      // });
      // });
  }
};

module.exports = workers;
