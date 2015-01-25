var fs = require('fs')
  , path = require('path');

var async = require('async');

var fingerprint = require('../../../utils/fingerprint.js')
  , iterator = require('../../../utils/iterator.js')
  , help = require('../../../utils/help.js')
  , parsers = require('../../parsers/index.js')
  , orm = require('./orm.js');

var Page = orm.models.Page
  , Property = orm.models.Property
  , Resource = orm.models.Resource;

// FIXME: using callback.call so callbacks refer to object is silly.  a ref can just be saved if needed
// TODO: remove this object?  better to just build on top of sequelize objects maybe


function FancyPage(relativePath) {
  this.relativePath = relativePath;
  this.dataObject = null;
  this.layout = null;
  this.resource = null;
  this.assetPath = null;

  this.isDirectory = false;
  this.contentPath = null;
  if (relativePath.indexOf(':') < 0 && help.isDirectory(relativePath)) {
    this.isDirectory = true;
    console.log('Content directory: finding page file...');
    this.contentPath = this._findParseable('page');

    if (!this.contentPath) {
      throw new Error('Content directory does not contain page file. e.g. %s/page.md', relativePath);
    }
    else {
      console.log('Content directory %s page file is %s', relativePath, this.contentPath);
    }
  }
  else {
    console.log('Not a content directory');
    this.contentPath = this.relativePath;
  }
}

FancyPage.prototype._findParseable = function(name) {
  for (var i=0; i < parsers.available.length; i++) {
    var ext = parsers.available[i];
    var pagePath = path.join(this.relativePath, '/' + name + '.' + ext);
    console.log('%s does page exist? %s', this.relativePath, pagePath);
    if (fs.existsSync(pagePath)) {
      return pagePath;
    }
  }
  return null;
};

FancyPage.prototype.init = function(properties, callback) {
  if (typeof properties === 'function') {
    callback = properties;
    properties = null;
  }

  var _this = this;
  _this.create(properties, function(err) {
    if (err) {
      return callback.call(_this, err);
    }
    _this.refresh(function(err) {
      if (err) {
        return callback.call(_this, err);
      }
      var assetPath = path.join(_this.relativePath, '/public'); // if path is a directory and has a public asset directory, load them
      fs.exists(assetPath, function(exists) {
        if (exists) {
          _this.assetPath = assetPath;
        }

        if (!_this.hasRoute()) {
          callback.call(_this, new Error('Page must have a route property'));
          return
        }
        else {
          callback.call(_this, null, _this);
        }
      });
    });
  });
};

FancyPage.prototype.create = function(properties, callback) {
  var _this = this
    , done = function(err, dataObject) {
        if (err) {
          return callback.call(_this, err);
        }
        _this.dataObject = dataObject;
        if (properties) {
          _this.setProperties(properties, callback);
        }
        else {
          _this.reload(callback);
        }
      };

  Page.find({
    where: { path: _this.relativePath },
    include: [ Property ]
  }).done(function(err, dataObject) {
    if (err) {
      return done(err);
    }
    else if (!dataObject) {
      Page.create({ path: _this.relativePath, fingerprint: 'NOT_FINGERPRINTED' }).done(done);
    }
    else {
      done(null, dataObject);
      return;
    }
  });
};

FancyPage.prototype.refresh = function(callback) {
  var _this = this;
  Page.find({
    where: { path: _this.relativePath },
    include: [ Property ]
  }).done(function(err, dataObject) {
    if (err) {
      return callback.call(_this, err);
    }
    _this.dataObject = dataObject;
    callback.call(_this, null);
  });
};

FancyPage.prototype.reload = function(callback) {
  var prefix = this.relativePath.split(':')[0];

  switch (prefix) {
    case 'provider':
      this._reloadProviderObject(callback);
    break;

    default:
      this._reloadFile(callback);
    break;
  }
};

FancyPage.prototype._reloadFile = function(callback) {
  var _this = this;
  console.log('fingerprint %s', this.contentPath);
  fingerprint.file(_this.contentPath, function(err, fingerprint) {
    console.log('\t-> fingerprint returned');
    if (err) {
      return callback.call(_this, err);
    }
    _this.dataObject.fingerprint = fingerprint;
    _this.dataObject.save().done(function(err) {
      console.log('\t-> save returned');
      if (err) {
        return callback.call(_this, err);
      }
      _this.clearProperties(function(err) {
        console.log('\t-> clearprops returned');
        if (err) {
          return callback.call(_this, err);
        }
        _this._parseFile(function(err, properties) {
          console.log('\t-> parser returned');
          if (err) {
            return callback.call(_this, err);
          }
          _this.setProperties(properties, callback.bind(_this));
        });
      });
    });
  });
};

FancyPage.prototype._parseFile = function(callback) {
  var _this = this;
  parsers(_this.contentPath, function(err, properties) {
    console.log('\t-> parser returned');
    if (err) {
      return callback(err);
    }
    // TODO: if parser data doesn't contain date, grab it from the last mod date of the file

    // page doesn't contain a body and the page is a content directory.  try to grab the body as a separate file
    // this really only useful for markdown body.md, otherwise it's better to just combine everything
    if (!properties.body && _this.isDirectory) {
      var bodyPath = _this._findParseable('body');
      parsers(bodyPath, function(err, bodyProps) {
        if (err) {
          return callback(err);
        }
        properties.body = bodyProps.body;
        callback(null, properties);
      });
    }
    else {
      callback(null, properties);
      return;
    }
  });
};

FancyPage.prototype._reloadProviderObject = function(callback) {
  var _this = this;
  _this.dataObject.fingerprint = fingerprint.objectSync(_this.dataObject.properties);
  _this.dataObject.save().done(callback.bind(_this));
};

FancyPage.prototype.remove = function(callback) {
  // TODO: stub. removes from db
  callback(null);
};

FancyPage.prototype.setProperties = function(properties, callback) {
  var _this = this
    , tasks = []
    , resourceTasks = [];

  if (!properties) {
    callback(null);
    return;
  }

  if (!_this.dataObject) {
    throw new Error('Page data object not yet ready');
  }

  // console.log('setProperties', properties);

  iterator(properties).forEach(function(prop) {
    var propName = prop[0]
      , propValue = prop[1];

    console.log('saving property', prop);

    switch (propName) {
      // case 'resource':
      //   var resourceName = propValue.trim().toLowerCase();
      //   tasks.push(function(taskCallback) {
      //     console.log('Looking up existing resource %s...', propValue);
      //     Resource.find({ where: { name: resourceName } }).done(function(err, resource) {
      //       if (err) {
      //         return taskCallback(err);
      //       }
      //       if (resource) {
      //         console.log('Resource %s already exists', propValue);
      //         taskCallback(null);
      //         // _this.dataObject.setResource(resource).done(taskCallback);
      //         return;
      //       }
      //       else {
      //         console.log('Creating resource %s...', propValue);
      //         Resource.create({ name: resourceName }).then(function(resource) {
      //           console.log('Done creating resource %s', propValue);
      //           // _this.dataObject.setResource(resource).done(taskCallback);
      //           taskCallback(null);
      //         });
      //         return;
      //       }
      //     });
      //   });
      // break;

      case 'layout':
        if (!_this.layout) {
          _this.layout = propValue;
        }
        else {
          console.warn('Layout has already been set for page %s', _this.relativePath);
        }
      break;

      case 'resource':
        if (!_this.resource) {
          _this.resource = propValue;
        }
        else {
          console.warn('Resource has already been set for page %s', _this.relativePath);
        }
      break;
    }

    tasks.push(function(taskCallback) {
      Property.create({ name: propName, content: propValue }).done(function(err, property) {
        if (err) {
          return taskCallback(err);
        }
        console.log('%s -> %s: %s', _this.relativePath, propName, propValue);
        _this.dataObject.addProperty(property).done(taskCallback);
      });
    });
  });

  async.parallel(tasks, function(err) {
    if (err) {
      return callback.call(_this, err);
    }
    _this.refresh(callback.bind(_this));
  });
};

FancyPage.prototype.clearProperties = function(callback) {
  console.log('Clearing properties...');
  var ids = [];
  (this.dataObject.properties || []).forEach(function(property) {
    ids.push(property.id);
  });
  if (ids.length) {
    Property.destroy({ where: { id: ids } }).done(callback);
  }
  else {
    console.log('No properties to clear');
    callback(null);
  }
};

FancyPage.prototype.getProperties = function() {
  return this.toTemplateObject();
};

FancyPage.prototype.hasRoute = function() {
  var properties = (this.dataObject || {}).properties || {};
  for (var i=0; i < properties.length; i++) {
    var property = properties[i];
    if ('route' === property.name) {
      return true;
    }
  }
  return false;
};

FancyPage.prototype.toTemplateObject = function() {
  var obj = {}
    , properties = (this.dataObject || {}).properties || {};
  // console.log('To Template Object %s', this.relativePath);
  for (var i=0; i < properties.length; i++) {
    var property = properties[i];
    // console.log('\t-> %s: %s', property.name, property.content);

    if (obj[property.name]) {
      if (typeof obj[property.name] !== 'object' || !('length' in obj[property.name])) {
        obj[property.name] = [ obj[property.name] ];
      }
      obj[property.name].push(property.content);
    }
    else {
      obj[property.name] = property.content;
    }
  }
  // console.log('return object', obj);
  return obj;
};

module.exports = FancyPage;
