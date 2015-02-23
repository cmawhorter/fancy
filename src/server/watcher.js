var config = require('../config/config.js');

var path = require('path');

var _ = require('lodash')
  , axon = require('axon')
  , request = require('request')
  , chokidar = require('chokidar')
  , glob = require('glob')
  , tinylr = require('tiny-lr');

var Properties = require('../data/properties.js')
  , Site = require('./watcher/site.js');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , file = require('../utils/file.js')
  , messageHandlers = require('./watcher/handlers.js');

module.exports = {
  start: function(options, callback) {
    callback = callback || function(err){ if (err) throw err; };
    options = options || {};
    options.livereloadport = options.livereloadport || 35729;

    var providers = glob.sync('data/providers/*/index.js');
    chokidar.watch('data/providers/**/*.@(js|json)', {
      ignored: '**/node_modules/**/*'
    }).on('change', function(filepath) {
      tell('Warning: Provider file changed!  Server may need to be reloaded to see the changes.');
      log.warn('Changed file: %s', filepath);
    });

    tinylr().listen(options.livereloadport, function() {
      log.info('Live Reload listening on :%s', options.livereloadport);
    });

    var watcher = chokidar.watch(options.themePath + '/**/*.@(ejs|js|css)', {
      ignored: 'support/**/*'
    });

    watcher.on('change', function(filepath) {
      if (filepath.indexOf('/public/')) {
        lrNotify(filepath.split('/public/')[1]);
      }
      else if (/\.ejs$/i.test(filepath)) {
        lrNotify('*');
      }
    });

    function lrNotify(urlPath) {
      request('http://localhost:' + options.livereloadport + '/changed?files=' + urlPath);
    }

    // FIXME: remove throttle?
    var site = new Site(options.target, providers, _.throttle(lrNotify, 100)).start(config.data.formats, callback);
    var handlers = messageHandlers(site);

    var sock = axon.socket('rep');
    sock.bind(options.port);

    sock.on('message', function(task, data, reply) {
      var handler = handlers[task];
      if (handler) {
        handlers[task](data, reply);
      }
      else {
        reply({ error: 500, message: 'No handler for: ' + task });
      }
    });

    return site;
  }
};
