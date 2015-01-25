var fs = require('fs')
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

var PROVIDER_PREFIX = 'provider:';

// FIXME: #1 priority. now that it's clear what needs to happen here, the entire FancyDb/FancyPage stuff is tangled and needs some attention: this needs to be an abstracting/caching layer between fancy and db

function FancyDb() {
  this.pages = {};
  this.resources = {};
  this.meta = {};
  this.relationships = {};
  this.providers = [];
}

FancyDb.prototype.init = function(callback) {
  var _this = this
    , tasks = [];

  orm.sequelize.sync({ force: true }).then(function() {
    _this.reload(function(err) { // reload from disk
      // FIXME: watching broken for now
      // tasks.push(function(taskCallback) {
      //   _this._watchFiles(taskCallback);
      // });
      // tasks.push(function(taskCallback) {
      //   _this._watchProviders(taskCallback);
      // });
      // async.parallel(tasks, function(err) {
        callback.call(_this, err);
      // });
    });
  });
};

FancyDb.prototype._watchFiles = function(callback) {
  var _this = this;
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
        callback(null, _this.getPage(page.path));
      });
      return;
    }
    else {
      return callback(new Error('Multiple pages match the route: ' + propertyValue));
    }
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
    if (err) {
      delete _this.pages[relativePath];
      return callback(err);
    }
    console.log('\t-> Caching resource %s at %s', page.resource, relativePath);
    _this._addResourceSync(page);
    _this._addMetaSync(page);
    _this._addRelationshipsSync(page);
    callback(null, page);
  });
};

FancyDb.prototype._addResourceSync = function(page) {
  console.log('\t\t-> (resource) %s.resource: %s', page.relativePath, page.resource);
  if (!this.resources[page.resource]) {
    this.resources[page.resource] = [];
  }
  if (this.resources[page.resource].indexOf(page) < 0) {
    console.log('\t\t-> resource rel not found...');
    this.resources[page.resource].push(page);
  }
  else {
    console.log('\t\t-> resource rel already exists');
  }
};

FancyDb.prototype._addMetaSync = function(page) {
  var properties = page.getProperties();
  for (var rel in properties) {
    console.log('\t\t-> (meta) %s.%s: %s', page.relativePath, rel, rel == 'body' ? '[body]' : properties[rel]);

    if (!this.meta[rel]) {
      this.meta[rel] = [];
    }
    if (this.meta[rel].indexOf(page) < 0) {
      this.meta[rel].push(page);
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

FancyDb.prototype._addRelationshipSync = function(page, rel, relValue) {
  console.log('\t\t-> (relationship) %s.%s: %s', page.relativePath, rel, rel == 'body' ? '[body]' : relValue);
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
  console.log('Adding page file %s', relativePath);
  var _this = this
    , page = _this.getPage(relativePath);

  if (page) {
    callback(null, page);
  }
  else {
    _this.createPage(relativePath, properties, callback);
  }
};

FancyDb.prototype.removeFile = function(relativePath, callback) {
  console.log('Removing page file %s', relativePath);
  var _this = this
    , page = _this.getPage(relativePath)
    , index = _this.resources[page.resource].indexOf(page);
  if (index > -1) {
    _this.resources[page.resource].splice(index, 1);
  }
  delete _this.pages[relativePath];
  page.remove(callback);
};

FancyDb.prototype.reloadFile = function(relativePath, callback) {
  console.log('Reloading page file %s', relativePath);
  var _this = this
    , page = _this.getPage(relativePath);
  page.reload(callback);
};

FancyDb.prototype.reload = function(callback) {
  var _this = this
    , tasks = [];
  tasks.push(function(taskCallback) {
    _this._reloadFiles(taskCallback);
  });
  tasks.push(function(taskCallback) {
    _this._reloadProviders(taskCallback);
  });
  async.parallel(tasks, function(err) {
    if (err) {
      return callback(err);
    }
    callback(null);
  });
};

FancyDb.prototype._reloadFiles = function(callback) {
  console.log('Reloading pages from disk...');
  var _this = this;
  glob('data/content/**/*.@(' + parsers.available.join('|') + ')', function(err, matches) {
    var tasks = [];
    if (err) {
      return callback(err);
    }
    matches.forEach(function(relativePath) {
      console.log('Page found... %s', relativePath);
      tasks.push(function(taskCallback) {
        if (help.isDirectory(relativePath)) {
          console.log('Is content directory: %s', relativePath);
          if (/\.html$/i.test(relativePath)) { // only html directories supported
            return _this.addFile(relativePath, taskCallback);
          }
          else {
            console.warn('Warning: Only .html directory is allowed: %s', relativePath);
            return taskCallback(null);
          }
        }
        else if (/\.html\/.*/i.test(relativePath)) { // html exists in subdir of a html dir
          console.log('Ignoring content directory file: %s', relativePath);
          return taskCallback(null);
        }
        else {
          return _this.addFile(relativePath, taskCallback);
        }
      });
    });
    async.parallel(tasks, callback);
  });
};

FancyDb.prototype._reloadProviders = function(callback) {
  console.log('Reloading pages from providers...');
  var _this = this
    , tasks = {};
  _this.providers.forEach(function(provider) {
    console.log('\t-> Found provider %s...', provider.name);
    tasks[provider.name] = function(taskCallback) {
      provider.reload(function(err, content) {
        console.log('Provider %s returned data', provider.name, content);
        taskCallback(err, content);
      });
    };
  });
  async.parallel(tasks, function(err, providerResources) {
    if (err) {
      return callback(err);
    }
    console.log('_reloadProviders -> providerResources', providerResources);
    var subtasks = [];
    Object.keys(providerResources).forEach(function(providerName) {
      var content = providerResources[providerName] || [];
      content.forEach(function(resource, index) {
        subtasks.push(function(subtaskCallback) {
          var resId = 'id' in resource ? resource.id : index
            , relativePath = PROVIDER_PREFIX + providerName + '/' + resId;
          console.log('Provider page found... %s', relativePath);
          _this.addFile(relativePath, resource, subtaskCallback);
        });
      });
    });
    async.parallel(subtasks, callback);
  });
};

module.exports = FancyDb;
