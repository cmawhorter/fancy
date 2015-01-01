var path = require('path');

var async = require('async')
  , glob = require('glob')
  , yaml = require('js-yaml')
  , urlPattern = require('url-pattern');

var server = require('./server/index.js')
  , db = require('./db/index.js')
  , parser = require('./parsers/index.js');

function Fancy(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // defaults
  this.options = {
      theme: 'blah'
    , port: 3000
    , settings: {}
  };

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

  this._init(callback.bind(this));
}

Fancy.prototype._init = function(callback) {
  var _this = this
    , tasks = [];

  tasks.push(function(taskCallback) {
    server(_this, function(err, app) {
      if (err) {
        return taskCallback(err);
      }
      _this.server = app;
      taskCallback(null);
    });
  });

  tasks.push(function(taskCallback) {
    db(_this, function(err, db) {
      if (err) {
        return taskCallback(err);
      }
      _this.db = db;
      taskCallback(null);
    });
  });

  tasks.push(function(taskCallback) {
    glob('./data/settings/**/*.yml', function(err, matches) {
      if (err) {
        return callback(err);
      }
      matches.forEach(function(relativePath) {
        var settingsKey = path.basename(relativePath, '.yml');
        _this.options.settings[settingsKey] = yaml.load(fs.readFileSync(relativePath, 'utf8'));
      });
    });
  });

  async.parallel(tasks, callback);
};

Fancy.prototype.start = function(callback) {
  var _this = this;

  _this.reloadContent(function(err) {
    if (err) {
      return callback(err);
    }
    _this.server.set('port', _this.options.port);
    var www;
    www = _this.server.listen(_this.server.get('port'), function() {
      callback(null, www);
    });
  });
};

Fancy.prototype.reloadContent = function(callback) {
  throw new Error('removing this');
};

Fancy.prototype.createResponse = function(url, page, params) {
  var res = {
      url: url
      // TODO: make this less weird?  site === settings.site
    , site: this.options.settings.site || {}
    , settings: this.options.settings
    , page: {}
    , params: params || {}
    , helpers: {} // TODO: change from fancy namespace to helpers and implement fancy helpers
    , plugins: {}
  };

  // TODO: extend with libraries (moment, etc.)
  // e.g... res.moment = moment;

  return res;
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
      return callback(null, _this.createResponse(url, page));
    }
    else { // no direct match found.  urlPattern matching
      for (var relativePath in _this.db.pages) {
        var page = _this.db.pages[relativePath];
        page.properties.routes.forEach(function(route) {
          var params = urlPattern.newPattern(route).match(propertyValue);
          // console.log(url, k, params);
          if (params) {
            return callback(null, _this.createResponse(url, page, params));
          }
        });
      }

      return callback(new Error('Page not found'));
    }
  });
};

Fancy.server = server;
Fancy.db = db;
Fancy.parser = parser;

module.exports = function(options, callback) {
  if (0 === arguments.length) {
    return Fancy;
  }
  else {
    return new Fancy(options, callback);
  }
};
