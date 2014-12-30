var fs = require('fs')
  , path = require('path');

var sequelize = require('sequelize')
  , glob = require('glob')
  , gaze = require('gaze')
  , async = require('async')
  , debounce = require('debounce');

function FancyDb(fancy, callback) {
  this.fancy = fancy;
  this.orm = new Sequelize(null, null, null, {
    dialect: 'sqlite',
    storage: path.join(fancy.options.cwd, './.fancy/db/pages.sqlite3'),
  });

  this._init(callback);
}

FancyDb.prototype._init = function(callback) {
  var _this = this;

  gaze(fancy.options.cwd, function(err, watcher) {
    if (err) {
      return callback(err);
    }

    // On file changed
    watcher.on('changed', function(filepath) {
      _this.reloadFile(filepath);
    });

    // On file added
    watcher.on('added', function(filepath) {
      _this.addFile(filepath);
    });

    // On file deleted
    watcher.on('deleted', function(filepath) {
      _this.removeFile(filepath);
    });

    _this.reloadFiles(callback);
  });
};

FancyDb.prototype.reloadFile = function(callback) {
  var _this = this;
  glob('**/*.html', { cwd: this.fancy.options.cwd }, function(err, matches) {
    var tasks = [];
    if (err) {
      return callback(err);
    }
    matches.forEach(function(f) {
      tasks.puch(function(taskCallback) {
        _this.addFile(f, taskCallback);
      });
    });
    async.parallel(tasks, callback);
  });
};

FancyDb.prototype.addFile = function(f, callback) {

};

FancyDb.prototype.removeFile = function(f, callback) {

};

FancyDb.prototype.reloadFiles = function(f, callback) {

};

module.exports = function(fancy, callback) {
  var fancyDb;

  fancyDb = new FancyDb(fancy, function(err) {
    if (err) {
      return callback(err);
    }
    callback(null, fancyDb);
  });
};
