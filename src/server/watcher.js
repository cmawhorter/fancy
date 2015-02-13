var path = require('path');

var messenger = require('messenger');

var Properties = require('../data/properties.js')
  , Site = require('./watcher/site.js');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js');

module.exports = {
  start: function(options) {
    options = options || {};
    var providers = [ path.join(process.cwd(), './data/providers/products/index.js') ];

    var site = new Site(options.target, providers).start();

    var server = messenger.createListener(options.port);
    server.on('find', function(message, data) {
      var properties = site.getPageForUrl(data.url);
      if (properties) {
        message.reply({ result: properties.getAsHash(data.locale) });
      }
      else {
        message.reply({ result: { error: 'Not Found', code: 404 } });
      }
    });
  }
};
