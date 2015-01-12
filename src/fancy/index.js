var fs = require('fs')
  , path = require('path');

var async = require('async')
  , glob = require('glob')
  , yaml = require('js-yaml')
  , urlPattern = require('url-pattern');

var server = require('./server/index.js')
  , FancyDb = require('./db/index.js')
  , helpers = require('./helpers/index.js')
  , parser = require('./parsers/index.js');

function Fancy(options) {
  options = options || {};

  // defaults
  this.options = {
      theme: 'blah'
    , port: 3000
    , config: {}
    , settings: {}
  };

  this.express = null;
  this.server = null;
  this.db = null;

  // load options
  for (var k in options) {
    if (k in this) {
      this.options[k] = options[k];
    }
    else {
      throw new Error('Invalid fancy option: ' + k);
    }
  }

  console.log('Loading site config.yml...');
  var configFilepath = './config.yml';
  if (fs.existsSync(configFilepath)) {
    var config = yaml.load(fs.readFileSync(configFilepath, 'utf8'));
    for (var k in config) {
      this.options.config[k] = config[k];
    }
  }
  console.log('\tSite config.yml loaded', this.options.config);
}

Fancy.prototype.init = function(callback) {
  var _this = this
    , tasks = [];

  tasks.push(function(taskCallback) {
    console.log('Loading web server...');
    server(_this, function(err, app) {
      if (err) {
        return taskCallback(err);
      }
      _this.express = app;
      console.log('\tWeb server loaded.');
      taskCallback(null);
    });
  });

  tasks.push(function(taskCallback) {
    console.log('Loading database...');
    _this.db = new FancyDb();
    (_this.options.config.providers || []).forEach(function(providerName) {
      _this.db.providers.push(require(path.join(process.cwd(), './data/providers/' + providerName + '/index.js'))); // TODO: move paths someplace configurable
    });
    _this.db.init(function(err, db) {
      if (err) {
        return taskCallback(err);
      }
      console.log('\tDatabase loaded.');
      taskCallback(null);
    });
  });

  // TODO: make async
  tasks.push(function(taskCallback) {
    console.log('Loading all site settings...');
    glob('./data/settings/**/*.yml', function(err, matches) {
      if (err) {
        return callback(err);
      }
      matches.forEach(function(relativePath) {
        var settingsKey = path.basename(relativePath, '.yml');
        _this.options.settings[settingsKey] = yaml.load(fs.readFileSync(relativePath, 'utf8'));
      });
      console.log('\tSite settings loaded.');
      taskCallback(null);
    });
  });

  async.parallel(tasks, function(err) {
    if (err) {
      return callback(err);
    }
    console.log('Fancy initialized. Starting server on port %d...', _this.options.port);
    _this.express.set('port', _this.options.port);
    _this.server = _this.express.listen(_this.express.get('port'), function() {
      callback.call(_this, null, _this.server);
    });
  });
};

Fancy.prototype.createResponse = function(url, page, params) {
  var _this = this;
  var res = {
      url: url
    , config: this.options.config || {}
    , settings: this.options.settings
    , params: params || {}
    , helpers: helpers
    , extensions: {
        pagination: require('../../examples/pagination-extension/pagination.js')
      }
    , site: {
          pages: Object.keys(this.db.pages).map(function(item) {
            return _this.db.pages[item].toTemplateObject();
          })
        , resources: this.getResourcesForTemplate()
      }
    , page: page.toTemplateObject()
  };

  // TODO: extend with libraries (moment, etc.)
  // e.g... res.moment = moment;

  return res;
};

// Fancy.prototype.getPagesForTemplate = function() {
//   var obj = {};
//   for (var k in this.db.pages) {
//     obj[k] = this.db.pages[k].toTemplateObject();
//   }
//   return obj;
// };

Fancy.prototype.getResourcesForTemplate = function() {
  var obj = {};
  console.log('Getting Resources for Response...');
  for (var k in this.db.resources) {
    console.log('\t%s', k);
    obj[k] = [];
    for (var i=0; i < this.db.resources[k].length; i++) {
      var data = this.db.resources[k][i].toTemplateObject();
      console.log('\t\t%s', data.route);
      obj[k].push(data);
    }
  }
  return obj;
};

// returns response object via callback
Fancy.prototype.requestPage = function(url, callback) {
  console.log('Getting page for %s...', url);
  var _this = this;

  _this.db.findPageByRoute(url, function(err, page) {
    if (err) {
      return callback(err);
    }
    if (page) {
      console.log('page found', page);
      return callback(null, {
          page: page
        , layout: page.layout
        , res: _this.createResponse(url, page)
      });
    }
    else { // no direct match found.  urlPattern matching
      for (var relativePath in _this.db.pages) {
        var page = _this.db.pages[relativePath];
        console.log('\t-> does page %s match?', page.relativePath);
        if (!page.dataObject.properties) {
          console.log('No properties found', page);
          process.exit();
        }
        for (var i=0; i < page.dataObject.properties.length; i++) {
          var property = page.dataObject.properties[i];
          if (property.name === 'route') {
            console.log('url pattern matching "%s" to "%s"', property.content, url);
            var params = urlPattern.newPattern(property.content).match(url);
            // console.log(url, k, params);
            if (params) {
              return callback(null, {
                  page: page
                , layout: page.layout
                , res: _this.createResponse(url, page, params)
              });
            }
          }
        }
      }
      var err = new Error('Not Found');
      err.status = 404;
      return callback(err);
    }
  });
};

module.exports = Fancy;
