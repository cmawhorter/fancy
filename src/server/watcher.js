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

    function changed(properties) {
      var urlPath = properties.getProperty('route')[0];
      request('http://localhost:' + options.livereloadport + '/changed?files=' + urlPath);

      for (var mount in config.data.mount) {
        var restr = mount;
        if (restr[0] != '^') {
          restr = '^' + restr;
        }
        var re = new RegExp(restr);
        var mounted = properties.relativePath.substr(options.target.length + 1);
        log.trace({ path: mounted, data: options.target, mount: mount, re: re.toString() }, 'testing mount point');
        if (0 === mounted.indexOf(mount) || re.test(mounted)) {
          log.debug({ path: mounted, mount: mount, properties: properties }, 'page matched');
          var allMatch = true;
          for (var propertyName in config.data.mount[mount]) {
            var val = config.data.mount[mount][propertyName];
            var negate = false;
            if (val[0] === '!') {
              negate = true;
            }
            var props = properties.getProperty(propertyName);
            var propmatch = false;
            for (var i=0; i < props.length; i++) {
              var prop = props[i];
              var propre = new RegExp(negate ? val.substr(1) : val, 'g');
              var propmatches = propre.test(prop);
              if (negate) {
                propmatches = !propmatches;
              }
              if (prop === val || propmatches) {
                log.trace({ path: mounted, mount: mount, property: prop }, 'match');
                propmatch = true;
                break;
              }
            }
            if (!propmatch) {
              log.trace({ path: mounted, mount: mount, property: propertyName, expected: val }, 'property mismatch');
              allMatch = false;
              break;
            }
          }
          if (!allMatch) {
            throw new Error('Mount point has invalid properties');
          }
        }
      }
    }

    // FIXME: remove throttle?
    var site = new Site(options.target, providers, changed).start(config.data.formats, callback);
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
