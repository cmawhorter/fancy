var fs = require('fs')
  , path = require('path');

var express = require('express')
  , async = require('async')
  , glob = require('glob')
  , yaml = require('js-yaml')
  , urlPattern = require('url-pattern');

var server = require('./server/index.js')
  , FancyDb = require('./db/index.js')
  , parser = require('./parsers/index.js')
  , objectUtil = require('../utils/object.js')
  , fingerprint = require('../utils/fingerprint.js');

var helpers = require('./helpers/index.js');

function Fancy(options) {
  options = options || {};
  // defaults
  this.options = {
      theme: 'blah'
    , port: 3000
    // , contentDirectories: [] // TODO: this is going to change so disabling use for now
    , providers: []
    , extensions: []
    , buildRoutes: []
  };
  // load options
  for (var k in options) {
    if (k in this.options) {
      this.options[k] = options[k];
    }
    else {
      throw new Error('Invalid fancy option: ' + k);
    }
  }

  console.log('Loading site config.yml...');
  var configFilepath = './config.yml';
  var config;
  if (fs.existsSync(configFilepath)) {
    config = yaml.load(fs.readFileSync(configFilepath, 'utf8')) || {};
    for (var k in config) {
      this.options[k] = config[k];
    }
  }
  console.log('\tSite config.yml loaded', config);


  // other properties
  this.knownRoutes = [];

  this.theme = {
      views: path.join(process.cwd(), './themes/' + this.options.theme + '/views')
    , supportPath: path.join(process.cwd(), './themes/' + this.options.theme + '/support/theme.js')
    , support: null
  }
  if (fs.existsSync(this.theme.supportPath)) {
    this.theme.support = require(this.theme.supportPath);
  }

  this.express = null;
  this.server = null;
  this.db = null;

  this.constants = {};

  this.extensions = {};


  // set of defaults

  // FIXME: should generalize this a bit into data directories, so providers, assets and constants are all loaded too
  this.options.contentDirectories = [ 'data/content' ]; // always look relative

  console.log('Loading extensions...');
  this.options.extensions = this.options.extensions || [];
  for (var i=0; i < this.options.extensions.length; i++) {
    var extensionName = this.options.extensions[i];
    var extensionPath = path.join(process.cwd(), './extensions/' + extensionName + '/index.js');
    if (fs.existsSync(extensionPath)) {
      console.log('Loading extension %s...', extensionPath);
      this.extensions[extensionName] = require(extensionPath);
    }
    else {
      console.warn('Warning: Unable to load extension %s', extensionPath);
    }
  }
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
    _this.db = new FancyDb(_this.options.contentDirectories);
    (_this.options.providers || []).forEach(function(providerName) {
      var providerPath = path.join(process.cwd(), './data/providers/' + providerName + '/index.js');
      if (fs.existsSync(providerPath)) {
        console.log('Loading provider %s...', providerPath);
        _this.db.providers.push(require(providerPath)); // TODO: move paths someplace configurable
      }
      else {
        console.warn('Warning: Unable to load provider %s', providerPath);
      }
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
    console.log('Loading all site constants...');
    glob('./data/constants/**/*.@(yml|json)', function(err, matches) {
      if (err) {
        return callback(err);
      }
      matches.forEach(function(relativePath) {
        switch (path.extname(relativePath)) {
          case '.yml':
            var constantsKey = path.basename(relativePath, '.yml');
            _this.constants[constantsKey] = yaml.load(fs.readFileSync(relativePath, 'utf8'));
          break;
          case '.json':
            var constantsKey = path.basename(relativePath, '.json');
            _this.constants[constantsKey] = JSON.parse(fs.readFileSync(relativePath, 'utf8'));
          break;
          default:
            throw new Error('Invalid constant file format %s', relativePath);
          break;
        }
      });
      console.log('\tSite constants loaded.');
      taskCallback(null);
    });
  });

  async.parallel(tasks, function(err) {
    if (err) {
      return callback(err);
    }
    console.log('Fancy initialized. Starting server on port %d...', _this.options.port);
    _this.express.set('port', _this.options.port);


    // console.log('Initializing static asset handlers for pages...');
    // for (var relativePath in _this.db.pages) {
    //   var page = _this.db.pages[relativePath]
    //     , pageAssets;
    //   if (page.assetPath) {
    //     pageAssets = path.join(process.cwd(), page.assetPath);
    //     console.log('\t-> %s', pageAssets);
    //     _this.express.use(express.static(pageAssets));
    //   }
    // }
    // console.log('Done.');

    _this.server = _this.express.listen(_this.express.get('port'), function() {
      callback.call(_this, null, _this.server);
    });
  });
};

Fancy.prototype.routeDiscovered = function(url) {
  if (this.knownRoutes.indexOf(url) < 0) {
    this.knownRoutes.push(url);
  }
};

Fancy.prototype.getView = function(currentLayout, relativePath) {
  currentLayout = 'layouts/' + (currentLayout || 'primary') + '.ejs';
  var viewPath = path.join(this.theme.views, path.dirname(currentLayout), relativePath);
  return viewPath;
};

// page can be Page object or {}
Fancy.prototype.createResponse = function(url, page, params) {
  var _this = this;
  var res = {};

  Object.defineProperty(res, 'fancy', { value: helpers(res, this), enumerable: true });
  Object.defineProperty(res, 'yield', { value: function(yieldUrl) {
    _this.routeDiscovered(yieldUrl);
  }, enumerable: true });
  Object.defineProperty(res, 'theme', { value: (_this.theme.support || function(){ return {}; })(res), enumerable: true });
  Object.defineProperty(res, 'extensions', { value: _this.extensions, enumerable: true }); // TODO: auto-load extensions


  Object.defineProperty(res, 'config', { value: objectUtil.flatten(_this.options || {}), enumerable: true });
  var constants = objectUtil.flatten(_this.constants || {});
  Object.defineProperty(res, 'constant', { value: constants, enumerable: true });
  Object.defineProperty(res, 'constants', { value: constants, enumerable: true });

  // deep freeze page and request so it doesn't get flattened (and matches other data structure if page.body is obj lit)

  page = page.toTemplateObject ? page.toTemplateObject() : page;
  objectUtil.deepFreeze(page);
  Object.defineProperty(res, 'page', { value: page, enumerable: true });

  var request = {
      url: url
    , params: params || {}
  };
  objectUtil.deepFreeze(request);
  Object.defineProperty(res, 'request', { value: request, enumerable: true });

  Object.defineProperty(res, 'site', { value: objectUtil.flatten({
      pages: Object.keys(_this.db.pages).map(function(item) {
        return _this.db.pages[item].toTemplateObject();
      })
    , resources: _this.getResourcesForTemplate()
    , meta: _this.getMetaForTemplate()
    , relationships: _this.getRelationshipsForTemplate()
  }), enumerable: true });

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

Fancy.prototype.getMetaForTemplate = function() {
  var obj = {};
  console.log('Getting Meta for Response...');
  for (var k in this.db.meta) {
    console.log('\t%s', k);
    obj[k] = [];
    for (var i=0; i < this.db.meta[k].length; i++) {
      var data = this.db.meta[k][i].toTemplateObject();
      console.log('\t\t%s', data.route);
      obj[k].push(data);
    }
  }
  return obj;
};

Fancy.prototype.getRelationshipsForTemplate = function() {
  var obj = {};
  console.log('Getting Relationships for Response...');
  for (var rel in this.db.relationships) {
    obj[rel] = {};
    console.log('\t%s', rel);
    for (var relVal in this.db.relationships[rel]) {
      obj[rel][relVal] = [];
      console.log('\t\t%s', relVal);
      for (var i=0; i < this.db.relationships[rel][relVal].length; i++) {
        var data = this.db.relationships[rel][relVal][i].toTemplateObject();
        console.log('\t\t\t%s', data.route);
        obj[rel][relVal].push(data);
      }
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
        , layout: page.layout || 'primary'
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
                , layout: page.layout || 'primary'
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
