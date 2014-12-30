var async = require('async');

var server = require('./server/index.js')
  , db = require('./db/index.js')
  , handler = require('./handlers/index.js')
  , parser = require('./parsers/index.js')
  , Page = require('./objects/page.js');

function Fancy(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // defaults
  this.options = {
      cwd: process.cwd()
    , theme: 'blah'
    , port: 3000
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

  this._init(callback);
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

  async.parallel(tasks, callback);
};

Fancy.prototype.start = function(callback) {
  var _this = this;

  _this.reloadContent(function(err) {
    if (err) {
      return callback(err);
    }
    _this.server.set('port', _this.options.port);
    _this.server.listen(_this.server.get('port'), function() {
      callback(null);
    });
  });
};

Fancy.prototype.reloadContent = function(callback) {

};

Fancy.server = server;
Fancy.db = db;
Fancy.handler = handler;
Fancy.parser = parser;
Fancy.objects = {
  Page: Page
};

module.exports = function(options, callback) {
  if (0 === arguments.length) {
    return Fancy;
  }
  else {
    return new Fancy(options, callback);
  }
};
