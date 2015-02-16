var fs = require('fs')
  , path = require('path');

var async = require('async')
  , mkdirp = require('mkdirp')
  , request = require('request');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , fingerprint = require('../utils/fingerprint.js');

module.exports = {
  start: function(options, callback) {
    options = options || {};
    var sock = axon.socket('req');
    sock.bind(options.port + 1);

    mkdirp.sync(options.target);

    var dictionary = {};
    var endpoint = 'http://localhost:' + options.port;

    var q = async.queue(function(task, callback) {
      var hashName = fingerprint.sync(task.url)
        , destination = path.join(options.target, hashName);
      dictionary[hashName] = task.url;
      request(endpoint + task.url)
        .pipe(fs.createWriteStream(destination))
        .on('error', E.event(callback))
        .on('finish', callback);
    }, 2);

    setImmediate(function() {
      sock.send('urls', { locale: null }, function(data) {
        data.urls.forEach(function(pendingUrl) {
          pending.push({
            url: pendingUrl
          });
        });
      });
    });

    // TODO: get yield urls and append to end of queue

    q.drain = function() {
      fs.writeFileSync(path.join(options.target, 'index.json'), JSON.stringify(dictionary, null, 2));
      callback();
    };
  }
};
