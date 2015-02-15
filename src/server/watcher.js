var path = require('path');

var _ = require('lodash')
  , axon = require('axon')
  , request = require('request')
  , chokidar = require('chokidar')
  , tinylr = require('tiny-lr');

var Properties = require('../data/properties.js')
  , Site = require('./watcher/site.js');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js')
  , messageHandlers = require('./watcher/handlers.js');

module.exports = {
  start: function(options) {
    options = options || {};
    var providers = [ path.join(process.cwd(), './data/providers/products/index.js') ];
    options.lrPort = options.lrPort || 35729;

    tinylr().listen(options.lrPort, function() {
      // console.log('... Listening on %s ...', options.lrPort);
    });

    var watcher = chokidar.watch(options.themePath + '/**/*.@(ejs|js|css)', {
      ignored: 'support/**/*'
    });

    watcher.on('change', function(filepath) {
      if (filepath.indexOf('/public/')) {
        lrNotify(filepath.split('/public/')[1]);
      }
      else if (/\.ejs$/i.test(filepath)) {
        lrNotify('*')
      }
    });

    function lrNotify(urlPath) {
      request('http://localhost:' + options.lrPort + '/changed?files=' + urlPath);
    }

    // FIXME: remove throttle?
    var site = new Site(options.target, providers, _.throttle(lrNotify, 100)).start();
    var handlers = messageHandlers(site);

    var sock = axon.socket('rep');
    sock.connect(options.port);

    sock.on('message', function(task, data, reply) {
      var handler = handlers[task];
      if (handler) {
        handlers[task](data, reply);
      }
      else {
        reply({ error: 500, message: 'No handler for: ' + task });
      }
    });
  }
};
