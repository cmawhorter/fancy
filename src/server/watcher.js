var path = require('path');

var axon = require('axon');

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

    var site = new Site(options.target, providers).start();
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
