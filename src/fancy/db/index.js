var fs = require('fs')
  , path = require('path');

var glob = require('glob')
  , gaze = require('gaze')
  , async = require('async')
  , debounce = require('debounce');

var file = require('../../utils/file.js')
  , help = require('../../utils/help.js')
  , parsers = require('../parsers/index.js')
  , orm = require('./lib/orm.js')
  , Page = require('./lib/page.js');

// FIXME: callback -> ready event
function FancyDb(cwd, callback) {
  // TODO: implement disk cache
  // var target = path.join(cwd, './.fancy/db/pages.sqlite3');
  this.cwd = cwd;
  this.orm = orm(':memory:');
  this.pages = [];
  this.cache = {
    resources: {},
    relationships: {},
    pages: {},
  };
  this._init(callback);
}

FancyDb.prototype._init = function(callback) {
  var _this = this;

  gaze('**/*.html', { cwd: _this.cwd }, function(err, watcher) {
    if (err) {
      return callback(err);
    }

    // // On file changed
    watcher.on('changed', function(filepath) {
      _this.reloadFile(filepath);
    });

    // // On file added
    watcher.on('added', function(filepath) {
      _this.addFile(filepath);
    });

    // // On file deleted
    watcher.on('deleted', function(filepath) {
      _this.removeFile(filepath);
    });

    _this.sync(callback);
  });
};

FancyDb.prototype.addFile = function(f, callback) {
  var _this = this;
  Page(_this.orm, _this.cwd, f, function(err, page) {
    if (err) {
      return callback(err);
    }
    _this.pages.push(page);
    callback(null);
  });
};

FancyDb.prototype.removeFile = function(f) {
  var index = this.pages.indexOf(this.getPageByPath(f));
  if (index > -1) {
    this.pages.splice(index, 1);
  }
};

FancyDb.prototype.reloadFile = function(f, callback) {
  var page = this.getPageByPath(f);
  if (page) {
    page.refresh(callback);
  }
  else {
    callback(new Error('Page not found'));
  }
};

FancyDb.prototype.sync = function(callback) {
  var _this = this;
  var tasks = [];
  glob('**/*.html', { cwd: _this.cwd }, function(err, matches) {
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

        _this.addFile(f, function(err, page) {
          if (err) {
            return taskCallback(err);
          }
          parsers(_this.cache, f, taskCallback);
        });
      });
    });
  });
  async.parallel(tasks, callback);
};

FancyDb.prototype.getPageByPath = function(f) {
  for (var i=0; i < this.pages.length; i++) {
    var page = this.pages[i];
    if (page.id === f) {
      return page;
    }
  }
  return null;
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
