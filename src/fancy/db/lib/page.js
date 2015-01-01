var path = require('path');

var async = require('async');

var file = require('../../../utils/file.js')
  , parsers = require('../parsers/index.js')
  , orm = require('./orm.js');

var Page = orm.models.Page
  , Property = orm.models.Property
  , Resource = orm.models.Resource;


// TODO: remove this object? it isn't necessary.  fancy/db/index.js can interact directly with sqlite

function FancyPage(relativePath) {
  this.relativePath = relativePath;
  this.dataObject = null;
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

  Page.find({ where: { path: relativePath } }).done(function(err, dataObject) {
    if (err) {
      return done(err);
    }
    else if (!dataObject) {
      Page.create({ path: relativePath, fingerprint: 'NOT_FINGERPRINTED' }).done(done);
    }
    else {
      done(null, dataObject);
      return;
    }
  });
};

FancyPage.prototype.reload = function(callback) {
  var _this = this;
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

FancyPage.prototype.getRoutes = function(callback) {
  var _this = this;

};

FancyPage.prototype._setProperties = function(properties, callback) {
  var _this = this
    , tasks = [];

  if (!this.dataObject) {
    throw new Error('Page data object not yet ready');
  }

  properties.properties.forEach(function(prop) {
    var propName = properties[0].trim().toLowerCase()
      , propValue = properties[1];

    switch (propName) {
      case 'resource':
        tasks.push(function(taskCallback) {
          Resour
          Resource.create({ name: propValue.trim().toLowerCase() }).save().then(function(resource) {
            _this.dataObject.setResource(resource).done(taskCallback);
          });
        });
      break;
    }

    tasks.push(function(taskCallback) {
      Property.create({ name: propName, content: propValue }).save().then(function(property) {
        _this.dataObject.addProperty(property).done(taskCallback);
      });
    });
  });

  async.parallel(tasks, callback);
};

FancyPage.find = function(relativePath, callback) {
  var page = new FancyPage(relativePath);
  page.init(function(err) {
    callback(err, this);
  });
}

module.exports = FancyPage;
