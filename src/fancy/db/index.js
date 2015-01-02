var fs = require('fs')
  , path = require('path');

var glob = require('glob')
  , gaze = require('gaze')
  , async = require('async')
  , debounce = require('debounce');

var file = require('../../utils/file.js')
  , help = require('../../utils/help.js')
  , FancyPage = require('./lib/page.js')
  , orm = require('./lib/orm.js');

var Page = orm.models.Page
  , Property = orm.models.Property
  , Resource = orm.models.Resource;

// FIXME: callback -> ready event
function FancyDb() {
  this.pages = {};
  this.resources = {};
}

FancyDb.prototype.init = function(callback) {
  var _this = this;

  orm.sequelize.sync({ force: true }).then(function() {
    _this.reload(function(err) { // reload from disk
      gaze('**/*.html', function(err, watcher) { // set up file watcher for changes
        if (err) {
          return callback(err);
        }

        watcher.on('changed', function(relativePath) {
          console.log('%s changed', relativePath);
          _this.reloadFile(relativePath);
        });

        watcher.on('added', function(relativePath) {
          console.log('%s was added', relativePath);
          _this.addFile(relativePath);
        });

        watcher.on('deleted', function(relativePath) {
          console.log('%s deleted', relativePath);
          _this.removeFile(relativePath);
        });

        callback.call(_this, null);
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
      pages[0].getPage().then(function(page) {
        console.log('found page', page);
        _this.getPage(page.path, callback);
      });
      return;
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
      if (!_this.resources[page.resource]) {
        _this.resources[page.resource] = [];
      }
      if (_this.resources[page.resource].indexOf(page) < 0) {
        _this.resources[page.resource].push(page);
      }
      callback(null, page);
    });
  }
};

FancyDb.prototype.addFile = function(relativePath, callback) {
  console.log('Adding page file %s', relativePath);
  var _this = this;
  _this.getPage(relativePath, callback);
};

FancyDb.prototype.removeFile = function(relativePath, callback) {
  console.log('Removing page file %s', relativePath);
  var _this = this;
  _this.getPage(relativePath, function(err, page) {
    if (err) {
      return callback(err);
    }
    var index = _this.resources[page.resource].indexOf(page);
    if (index > -1) {
      _this.resources[page.resource].splice(index, 1);
    }
    page.remove();
    delete _this.pages[relativePath];
  });
};

FancyDb.prototype.reloadFile = function(relativePath, callback) {
  console.log('Reloading page file %s', relativePath);
  var _this = this;
  _this.getPage(relativePath, function(err, page) {
    if (err) {
      return callback(err);
    }
    page.reload(callback);
  });
};

FancyDb.prototype.reload = function(callback) {
  console.log('Reloading pages from disk...');
  var _this = this;
  glob('**/*.html', function(err, matches) {
    var tasks = [];
    if (err) {
      return callback(err);
    }
    matches.forEach(function(relativePath) {
      console.log('Page found... %s', relativePath);
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
    async.parallel(tasks, callback);
  });
};

module.exports = FancyDb;
