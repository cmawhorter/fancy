var path = require('path');

var async = require('async');

var file = require('../../../utils/file.js')
  , parsers = require('../../parsers/index.js')
  , orm = require('./orm.js');

var Page = orm.models.Page
  , Property = orm.models.Property
  , Resource = orm.models.Resource;


// TODO: remove this object? it isn't necessary.  fancy/db/index.js can interact directly with sqlite

function FancyPage(relativePath) {
  this.relativePath = relativePath;
  this.dataObject = null;
  this.layout = null;
  this.resource = null;
}

FancyPage.prototype.init = function(callback) {
  this.create(function(err) {
    if (err) {
      return callback.call(this, err);
    }
    this.reload(function(err) {
      if (err) {
        return callback.call(this, err);
      }
      callback.call(this, null);
    });
  });
};

FancyPage.prototype.create = function(callback) {
  var _this = this
    , done = function(err, dataObject) {
        if (err) {
          return callback.call(_this, err);
        }
        _this.dataObject = dataObject;
        callback.call(_this, null);
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
  var _this = this;
  console.log('fingerprint %s', _this.relativePath);
  file.fingerprint(_this.relativePath, function(err, fingerprint) {
    if (err) {
      return callback.call(_this, err);
    }
    _this.dataObject.fingerprint = fingerprint;
    _this.dataObject.save().done(function(err) {
      if (err) {
        return callback.call(_this, err);
      }
      parsers(_this.relativePath, function(err, properties) {
        if (err) {
          return callback.call(_this, err);
        }
        _this._setProperties(properties, callback.bind(_this));
      });
    });
  });
};

FancyPage.prototype.remove = function() {
  // TODO: stub
};

FancyPage.prototype._setProperties = function(properties, callback) {
  var _this = this
    , tasks = []
    , resourceTasks = [];

  if (!this.dataObject) {
    throw new Error('Page data object not yet ready');
  }

  // console.log('_setProperties', properties);

  properties.forEach(function(prop) {
    var propName = prop[0].trim().toLowerCase()
      , propValue = prop[1];

    // console.log('saving property', prop);

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
      Property.create({ name: propName, content: propValue }).then(function(property) {
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

FancyPage.prototype.toTemplateObject = function() {
  var obj = {};
  for (var i=0; i < this.dataObject.properties.length; i++) {
    var property = this.dataObject.properties[i];
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
  console.log('template object for %s', this.relativePath, obj);
  return obj;
};

FancyPage.find = function(relativePath, callback) {
  var page = new FancyPage(relativePath);
  page.init(function(err) {
    callback(err, this);
  });
}

module.exports = FancyPage;
