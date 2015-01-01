var fs = require('fs')
  , path = require('path');

var glob = require('glob')
  , gaze = require('gaze')
  , async = require('async')
  , debounce = require('debounce');

var file = require('../../utils/file.js')
  , help = require('../../utils/help.js')
  , FancyPage = require('./lib/page.js')
  , orm = require('./orm.js');

var Page = orm.models.Page
  , Property = orm.models.Property
  , Resource = orm.models.Resource;

// FIXME: callback -> ready event
function FancyDb() {
  this.pages = {};
}

FancyDb.prototype.init = function(callback) {
  var _this = this;

  _this.reload(function(err) { // reload from disk
    gaze('**/*.html', function(err, watcher) { // set up file watcher for changes
      if (err) {
        return callback(err);
      }

      watcher.on('changed', function(relativePath) {
        _this.reloadFile(relativePath);
      });

      watcher.on('added', function(relativePath) {
        _this.addFile(relativePath);
      });

      watcher.on('deleted', function(relativePath) {
        _this.removeFile(relativePath);
      });
    });
  });
};

FancyDb.prototype.findPageByProperty = function(propertyName, propertyValue, callback) {
  var _this = this;
  Property.findAll({ where: { name: propertyName.trim().toLowerCase(), content: propertyValue } }).done(callback);
};

FancyDb.prototype.findPageByRoute = function(propertyValue, callback) {
  var _this = this;
  _this.findPageByProperty('route', propertyValue, function(err, pages) {
    if (err) {
      return callback(err);
    }
    if (0 === pages.length) {
      return callback(null, null); // not found
    }
    else if (1 === pages.length) {
      return _this.getPage(pages[0].relativePath, callback);
    }
    else {
      return callback(new Error('Multiple pages match the route: ' + propertyValue));
    }
  });
};

FancyDb.prototype.getPage = function(relativePath, callback) {
  var _this = this
    , page = _this.pages[relativePath];
  if (page) {
    return callback(null, page);
  }
  else {
    FancyPage.find(relativePath, function(err, page) {
      if (err) {
        return callback(err);
      }
      _this.pages[relativePath] = page;
      callback(null, page);
    });
  }
};

FancyDb.prototype.addFile = function(relativePath, callback) {
  var _this = this;
  _this.getPage(relativePath, callback);
};

FancyDb.prototype.removeFile = function(relativePath, callback) {
  var _this = this;
  _this.getPage(relativePath, function(err, page) {
    if (err) {
      return callback(err);
    }
    page.remove();
    delete _this.pages[relativePath];
  });
};

FancyDb.prototype.reloadFile = function(relativePath, callback) {
  var _this = this;
  _this.getPage(relativePath, function(err, page) {
    if (err) {
      return callback(err);
    }
    page.reload(callback);
  });
};

FancyDb.prototype.reload = function(callback) {
  var _this = this
    , tasks = [];
  glob('**/*.html', function(err, matches) {
    if (err) {
      return callback(err);
    }
    matches.forEach(function(relativePath) {
      tasks.push(function(taskCallback) {
        if (help.isDirectory(relativePath)) {
          // TODO: implement alternative data entry (i.e. md, html or txt)
          console.warn('Directories are not currently supported...');
          return taskCallback(null);
        }
        else if (/\.html.*\.html$/i.test(relativePath)) { // path exists underneath a directory page, don't process
          console.warn('HTML files in a content directory are disallowed: %s', relativePath);
          return taskCallback(null);
        }
        else {
          _this.addFile(relativePath, taskCallback);
        }
      });
    });
  });
  async.parallel(tasks, callback);
};

module.exports = function(fancy, callback) {
  var fancyDb;

  fancyDb = new FancyDb(function(err) {
    if (err) {
      return callback(err);
    }
    // console.log(fancyDb.cache); process.exit();
    callback(null, fancyDb);
  });
};
