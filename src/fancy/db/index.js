var os = require('os')
  , fs = require('fs')
  , path = require('path');

var glob = require('glob')
  , gaze = require('gaze')
  , async = require('async')
  , debounce = require('debounce');

var fingerprint = require('../../utils/fingerprint.js')
  , help = require('../../utils/help.js')
  , FancyPage = require('./lib/page.js')
  , orm = require('./lib/orm.js')
  , parsers = require('../parsers/index.js');

var Page = orm.models.Page
  , Property = orm.models.Property
  , Resource = orm.models.Resource;

var IS_WIN = os.platform() === 'win32';
var PROVIDER_PREFIX = 'provider:';

// patch gaze
var gazeHelper = require('gaze/lib/helper.js');
gazeHelper.forEachSeries = function forEachSeries(arr, iterator, callback) {
  if (!arr.length) { return callback(); }
  var completed = 0;
  var iterate = function() {
    process.nextTick(function() {
      iterator(arr[completed], function (err) {
        if (err) {
          callback(err);
          callback = function() {};
        } else {
          completed += 1;
          if (completed === arr.length) {
            callback(null);
          } else {
            iterate();
          }
        }
      });
    });
  };
  iterate();
};

// FIXME: #1 priority. now that it's clear what needs to happen here, the entire FancyDb/FancyPage stuff is tangled and needs some attention: this needs to be an abstracting/caching layer between fancy and db

function FancyDb(contentDirectories, dataChangedHandler) {
  this.contentDirectories = contentDirectories || [];
  this.dataChangedHandler = dataChangedHandler || function(){};
  this.pages = {};
  this.resources = {};
  this.meta = {};
  this.relationships = {};
  this.providers = [];
  this._pagesAdded = 0;
  this._pagesCompleted = 0;
}

FancyDb.prototype.init = function(callback) {
  var _this = this
    , tasks = [];

  orm.sequelize.sync({ force: true }).then(function() {
    _this.reload(function(err) { // reload from disk
      tasks.push(function(taskCallback) {
        _this._watchFiles(taskCallback);
      });
      // tasks.push(function(taskCallback) {
      //   _this._watchProviders(taskCallback);
      // });
      async.parallelLimit(tasks, 2, function(err) {
        callback.call(_this, err);
      });
    });
  }, function(err) {
    callback.call(_this, err);
  });
};

FancyDb.prototype._watchFiles = function(callback) {
  var _this = this;
  // FIXME: this iterates an array but calls the callback each iteration
  _this.contentDirectories.forEach(function(contentDirectory) {
    // console.log('Watching files in content directory: %s', contentDirectory)
    if (IS_WIN) {
      console.log('*** File watching is disabled on Windows ***');
      console.log('Files will not be watched for changes in: ', contentDirectory);
      _this._watchFilesWin(contentDirectory, callback);
    }
    else {
      _this._watchFilesNix(contentDirectory, callback);
    }
  });
};

FancyDb.prototype._watchFilesNix = function(contentDirectory, callback) {
  var _this = this;
  gaze(contentDirectory + '/**/*.html', function(err, watcher) { // set up file watcher for changes
    if (err) {
      return callback(err);
    }

    watcher.on('changed', function(absolutePath) {
      var relativePath = help.absoluteToRelative(absolutePath);
      relativePath = help.getContentDirectoryPath(relativePath);
      if (_this.isValidFile(relativePath)) {
        console.log('%s changed', relativePath);
        _this.reloadFile(relativePath, function(err) {
          if (err) {
            throw err;
          }
          _this.dataChangedHandler(relativePath);
        });
      }
    });

    watcher.on('added', function(absolutePath) {
      var relativePath = help.absoluteToRelative(absolutePath);
      relativePath = help.getContentDirectoryPath(relativePath);
      if (_this.isValidFile(relativePath)) {
        console.log('%s was added', relativePath);
        _this.addFile(relativePath, function(err) {
          if (err) {
            throw err;
          }
          _this.dataChangedHandler(relativePath);
        });
      }
    });

    watcher.on('deleted', function(absolutePath) {
      var relativePath = help.absoluteToRelative(absolutePath);
      relativePath = help.getContentDirectoryPath(relativePath);
      if (_this.isValidFile(relativePath)) {
        console.log('%s deleted', relativePath);
        _this.removeFile(relativePath, function(err) {
          if (err) {
            throw err;
          }
          _this.dataChangedHandler(relativePath);
        });
      }
    });

    callback(null);
  });
};

FancyDb.prototype._watchFilesWin = function(contentDirectory, callback) {
  var _this = this;
  glob(contentDirectory + '/**/*.html', function(err, files) {
    if (err) {
      return callback(err);
    }
    files.forEach(function(relativePath) {
      relativePath = help.getContentDirectoryPath(relativePath);
      if (_this.isValidFile(relativePath)) {
        _this.addFile(relativePath, function(err) {
          if (err) {
            throw err;
          }
          _this.dataChangedHandler(relativePath);
        });
      }
    });

    callback(null);
  });
};

FancyDb.prototype._watchProviders = function(callback) {
  callback(null);
  // TODO: implementing watching inside provider
  // var _this = this
  //   , tasks = [];
  // _this.providers.forEach(function(provider) {
  //   tasks.push(function(taskCallback) {
  //   });
  // });
  // async.parallel(tasks, function(err) {
  //   if (err) {
  //     return callback(err);
  //   }
  //   callback(null);
  // });
};

FancyDb.prototype.findPageByProperty = function(propertyName, propertyValue, callback) {
  var pages = [];
  for (var relativePath in this.pages) {
    var page = this.pages[relativePath];
    if (page.hasProperty(propertyName, propertyValue)) {
      // console.log('page %s has property %s and value %s', relativePath, propertyName, propertyValue);
      pages.push(page);
    }
  }
  callback(null, pages);

  // FIXME: turn properties back on when db is improved

  // var _this = this;
  // // need to stringify content lookup since all content values are stringified
  // Property.findAll({ where: { name: propertyName, content: JSON.stringify(propertyValue) } }).done(callback);
};

FancyDb.prototype.findPageByRoute = function(propertyValue, callback) {
  var _this = this;
  _this.findPageByProperty('route', propertyValue, function(err, pages) {
    if (err) {
      return callback(err);
    }
    callback(null, pages.filter(function(element) { return !!element; }));
    // FIXME: turn properties back on when db is improved

    // console.log('findPageByRoute %s matching', pages.length);
    // var tasks = [];
    // pages.forEach(function(dbPage) {
    //   tasks.push(function(taskCallback) {
    //     dbPage.getPage().then(function(page) {
    //       taskCallback(null, _this.getPage(page.relativePath));
    //     });
    //   });
    // });
    // async.parallelLimit(tasks, 2, function(err, matches) {
    //   if (err) {
    //     return callback(err);
    //   }
    //   callback(null, matches.filter(function(element) {
    //     return !!element;
    //   }));
    // });

  });
};

FancyDb.prototype.getPage = function(relativePath) {
  return this.pages[relativePath];
};

FancyDb.prototype.createPage = function(relativePath, properties, callback) {
  var _this = this
    , page = new FancyPage(relativePath);
  _this.pages[relativePath] = page;
  page.init(properties, function(err) {
    _this._pagesCompleted++;
    if (err) {
      delete _this.pages[relativePath];
      return callback(err);
    }
    // console.log('\t-> Caching resource %s at %s', page.resource, relativePath);
    _this._addResourceSync(page);
    _this._addMetaSync(page);
    _this._addRelationshipsSync(page);
    callback(null, page);
  });
};

FancyDb.prototype._addResourceSync = function(page) {
  // console.log('\t\t-> (resource) %s.resource: %s', page.relativePath, page.resource);
  if (!this.resources[page.resource]) {
    this.resources[page.resource] = [];
  }
  if (this.resources[page.resource].indexOf(page) < 0) {
    // console.log('\t\t-> resource rel not found...');
    this.resources[page.resource].push(page);
  }
  else {
    // console.log('\t\t-> resource rel already exists');
  }
};

FancyDb.prototype._removeResourceSync = function(page) {
  for (var relName in this.resources) {
    var results = this.resources[relName];
    for (var i=0; i < results.length; i++) {
      if (results[i].relativePath == page.relativePath) {
        // console.log('\t-> removing resource %s => %s', relName, page.relativePath);
        results.splice(i, 1);
      }
    }
  }
};

FancyDb.prototype._addMetaSync = function(page) {
  var properties = page.getProperties();
  for (var rel in properties) {
    // console.log('\t\t-> (meta) %s.%s: %s', page.relativePath, rel, rel == 'body' ? '[body]' : properties[rel]);

    if (!this.meta[rel]) {
      this.meta[rel] = [];
    }
    if (this.meta[rel].indexOf(page) < 0) {
      this.meta[rel].push(page);
    }
  }
};

FancyDb.prototype._removeMetaSync = function(page) {
  for (var relName in this.meta) {
    var results = this.meta[relName];
    for (var i=0; i < results.length; i++) {
      if (results[i].relativePath == page.relativePath) {
        // console.log('\t-> removing meta %s => %s', relName, page.relativePath);
        results.splice(i, 1);
      }
    }
  }
};

FancyDb.prototype._addRelationshipsSync = function(page) {
  var properties = page.getProperties();
  for (var rel in properties) {
    var relValue = properties[rel];
    if (!!relValue && typeof relValue === 'object' && 'length' in relValue) {
      for (var i=0; i < relValue.length; i++) {
        this._addRelationshipSync(page, rel, relValue);
      }
    }
    else {
      this._addRelationshipSync(page, rel, relValue);
    }
  }
};

FancyDb.prototype._removeRelationshipsSync = function(page) {
  for (var relName in this.relationships) {
    for (var relVal in this.relationships[relName]) {
      var results = this.relationships[relName][relVal];
      for (var i=0; i < results.length; i++) {
        if (results[i].relativePath == page.relativePath) {
          // console.log('\t-> removing relationship %s: %s => %s', relName, relVal, page.relativePath);
          results.splice(i, 1);
        }
      }
    }
  }
};

FancyDb.prototype._addRelationshipSync = function(page, rel, relValue) {
  if (rel.toLowerCase() === 'body') { // skip body
    return;
  }
  // console.log('\t\t-> (relationship) %s.%s: %s', page.relativePath, rel, rel == 'body' ? '[body]' : relValue);
  if (!relValue || typeof relValue !== 'object' || !('length' in relValue)) {
    relValue = [relValue];
  }
  for (var i=0; i < relValue.length; i++) {
    var val = relValue[i];
    if (!this.relationships[rel]) {
      this.relationships[rel] = {};
    }
    if (!this.relationships[rel][val]) {
      this.relationships[rel][val] = [];
    }
    if (this.relationships[rel][val].indexOf(page) < 0) {
      this.relationships[rel][val].push(page);
    }
  }
};

// TODO: compare sha1 to see if it's necessary to re-parse
FancyDb.prototype.addFile = function(relativePath, properties, callback) {
  if (typeof properties === 'function') {
    callback = properties;
    properties = null;
  }
  // console.log('Adding page file %s', relativePath);
  var _this = this
    , page = _this.getPage(relativePath);

  if (page) {
    callback(null, page, true);
  }
  else {
    _this.createPage(relativePath, properties, callback);
  }
};

FancyDb.prototype.removeFile = function(relativePath, callback) {
  // console.log('Removing page file %s', relativePath);
  var _this = this
    , page = _this.getPage(relativePath);
  if (page) {
    _this._removeRelationshipsSync(page);
    _this._removeMetaSync(page);
    _this._removeResourceSync(page);
    delete _this.pages[relativePath];
    page.remove(callback);
  }
  else {
    callback(null);
  }
};

FancyDb.prototype.reloadFile = function(relativePath, callback) {
  var _this = this;
  _this.removeFile(relativePath, function(err) {
    if (err) {
      return callback(err);
    }
    _this.addFile(relativePath, callback);
  });
};

FancyDb.prototype.reload = function(callback) {
  var _this = this
    , tasks = [];
  var notifier = help.notifier('Building pages');
  tasks.push(function(taskCallback) {
    _this._reloadFiles(taskCallback);
  });
  tasks.push(function(taskCallback) {
    _this._reloadProviders(taskCallback);
  });
  notifier.add(function() {
    notifier.update(_this._pagesCompleted / _this._pagesAdded);
  }, 500);
  async.parallel(tasks, function(err) {
    if (err) {
      return callback(err);
    }
    notifier.done();
    callback(null);
  });
};

FancyDb.prototype.isValidFile = function(relativePath) {
  var valid = false;
  if (help.isDirectory(relativePath)) {
    if (/\.html$/i.test(relativePath)) { // only html directories supported
      valid = true;
    }
    else {
      console.warn('Warning: Only .html directory is allowed: %s', relativePath);
    }
  }
  else if (/\.html\/.*/i.test(relativePath)) { // html exists in subdir of a html dir
    console.log('Processing as content directory: %s', relativePath);
  }
  else {
    valid = true;
  }
  return valid;
};

FancyDb.prototype._reloadFiles = function(callback) {
  var _this = this
    , matches = [];
  // console.log('Reloading pages from disk...');

  for (var i=0; i < _this.contentDirectories.length; i++) {
    var contentDirectory = _this.contentDirectories[i];
    // console.log('Globbing files in content directory: %s', contentDirectory)
    matches = matches.concat(glob.sync(path.normalize(contentDirectory + '/') + '/**/*.@(' + parsers.available.join('|') + ')'));
  }

  var tasks = []
    , totalFound = 0;
  matches.forEach(function(relativePath) {
    if (_this.isValidFile(relativePath)) {
      tasks.push(function(taskCallback) {
        _this.addFile(relativePath, taskCallback);
      });
    }
  });
  _this._pagesAdded += tasks.length;
  console.log('\t-> Content data contains %s resources', tasks.length);
  async.parallelLimit(tasks, 2, callback);
};

FancyDb.prototype._reloadProviders = function(callback) {
  // console.log('Reloading pages from providers...');
  var _this = this
    , tasks = {};
  _this.providers.forEach(function(provider) {
    // console.log('\t-> Found provider %s...', provider.name);
    tasks[provider.name] = function(taskCallback) {
      provider.reload(function(err, content) {
        console.log('\t-> Provider %s returned %s resources', provider.name, content.length);
        _this._pagesAdded += content.length;
        taskCallback(err, content);
      });
    };
  });
  async.parallelLimit(tasks, 2, function(err, providerResources) {
    if (err) {
      return callback(err);
    }
    var subtasks = [];
    Object.keys(providerResources).forEach(function(providerName) {
      var content = providerResources[providerName] || [];
      content.forEach(function(resource, index) {
        if (resource) {
          subtasks.push(function(subtaskCallback) {
            var resId = 'id' in resource ? resource.id : index
              , relativePath = PROVIDER_PREFIX + providerName + '/' + resId;
            _this.addFile(relativePath, resource, subtaskCallback);
          });
        }
        else {
          console.warn('Warning: Provider %s sent a null resource: %j', providerName, resource);
        }
      });
    });
    async.parallelLimit(subtasks, 2, callback);
  });
};

module.exports = FancyDb;
