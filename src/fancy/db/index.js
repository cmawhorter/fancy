var fs = require('fs')
  , path = require('path');

var glob = require('glob')
  , gaze = require('gaze')
  , async = require('async')
  , debounce = require('debounce');

var file = require('../../utils/file')
  , help = require('../../utils/help')
  , parsers = require('../parsers/index.js')
  , orm = require('./lib/orm');

// FIXME: callback -> ready event
function FancyDb(cwd, callback) {
  // TODO: implement disk cache
  // var target = path.join(cwd, './.fancy/db/pages.sqlite3');
  this.cwd = cwd;
  this.orm = orm(':memory:');
  this.cache = {
    resources: {},
    relationships: {},
    pages: {},
  };
  this._init(callback);
}

FancyDb.prototype._init = function(callback) {
  var _this = this;

  gaze(_this.cwd, function(err, watcher) {
    if (err) {
      return callback(err);
    }

    // // On file changed
    // watcher.on('changed', function(filepath) {
    //   _this.reloadFile(filepath);
    // });

    // // On file added
    // watcher.on('added', function(filepath) {
    //   _this.addFile(filepath);
    // });

    // // On file deleted
    // watcher.on('deleted', function(filepath) {
    //   _this.removeFile(filepath);
    // });

    // FIXME: reload row instead of entire dataset
    watcher.on('all', function(event, filepath) {
      _this.sync(callback);
    });

    _this.sync(callback);
  });
};

// FancyDb.prototype.reloadFile = function(callback) {
// };

// FancyDb.prototype.addFile = function(f, callback) {
// };

// FancyDb.prototype.removeFile = function(f, callback) {
// };

FancyDb.prototype.sync = function(callback) {
  var _this = this;
  glob('**/*.html', { cwd: _this.cwd }, function(err, matches) {
    var tasks = [];
    if (err) {
      return callback(err);
    }
    matches.forEach(function(f) {
      var filepath = path.join(_this.cwd, f);
      tasks.push(function(taskCallback) {
        if (help.isDirectory(filepath)) {
          // TODO: implement alternative data entry (i.e. md, html or txt)
          console.warn('Directories are not currently supported...');
          return taskCallback(null);
        }
        else if (/\.html.*\.html$/i.test(f)) { // path exists underneath a directory page, don't process
          console.warn('HTML files in a content directory are disallowed: %s', f);
          return taskCallback(null);
        }
        // else {
        // }

        // file.fingerprint(f, function(err, fingerprint) {
        //   if (err) {
        //     return taskCallback(err);
        //   }
          // _this.orm.models.Page.create({
          //     fingerprint: fingerprint
          //   , name: f
          // }).done(function(err) {
          //   if (err) {
          //     return taskCallback(err);
          //   }
            parsers(_this.cache, f, taskCallback);
          // });
        // });
      });
    });
    async.parallel(tasks, callback);
  });
};

FancyDb.prototype.reloadFiles = function(f, callback) {
};

module.exports = function(fancy, callback) {
  var fancyDb;

  fancyDb = new FancyDb(fancy.options.cwd, function(err) {
    if (err) {
      return callback(err);
    }
    // console.log(fancyDb.cache); process.exit();
    callback(null, fancyDb);
  });
};
