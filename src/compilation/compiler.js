var fs = require('fs')
  , path = require('path');

var async = require('async')
  , axon = require('axon')
  , mkdirp = require('mkdirp')
  , request = require('request');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , fingerprint = require('../utils/fingerprint.js');

module.exports = {
  start: function(options, callback) {
    callback = callback || function(){};
    options = options || {};
    var dbPort = options.port + 1;
    var sock = axon.socket('req');
    sock.connect(dbPort);

    tell('Starting compiler...');

    mkdirp.sync(options.target);

    tell('Destination confirmed: %s', options.target);

    var dictionary = {};
    var endpoint = 'http://localhost:' + options.port;

    tell('Endpoint: %s', endpoint);

    tell('Retrieving urls...');

    sock.send('urls', { locale: null }, function(data) {
      tell('Retrieved %s urls', data.urls.length);

      var q = async.queue(function(task, callback) {
        var hashName = fingerprint.sync(task.url)
          , destination = path.join(options.target, hashName);
        dictionary[hashName] = task.url;
        tell('\t-> Processing "%s" and writing to %s', task.url, destination);
        request.get(endpoint + task.url)
          .pipe(fs.createWriteStream(destination))
          .on('error', E.event(callback))
          .on('finish', callback);
      }, 2);

      // TODO: get yield urls and append to end of queue
      q.drain = function() {
        tell('Writing index...');
        fs.writeFileSync(path.join(options.target, 'index.json'), JSON.stringify(dictionary, null, 2));
        tell('Done!');
        callback();
      };

      data.urls.forEach(function(pendingUrl) {
        q.push({
          url: pendingUrl
        });
      });
    });
  }
};
