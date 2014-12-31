var path = require('path');

var async = require('async');

var file = require('../../../utils/file.js');

function Page(orm, filepath, dataObject) {
  this.orm = orm;
  this.filepath = filepath;
  this.dataObject = null;
}

Page.prototype.refresh = function(callback) {
  var _this = this;
  file.fingerprint(_this.filepath, function(err, fingerprint) {
    if (err) {
      return callback(err);
    }
    _this.dataObject.fingerprint = fingerprint;
    _this.dataObject.save().done(callback);
  });
};

module.exports = function(orm, cwd, relativePath, callback) {
  var filepath = path.join(cwd, relativePath)
    , done = function(err, dataObject) {
        if (err) {
          return callback(err);
        }
        callback(null, new Page(orm, filepath, dataObject));
      };

  file.fingerprint(filepath, function(err, fingerprint) {
    if (err) {
      return done(err);
    }
    orm.models.Page.find(relativePath).done(function(err, page) {
      if (err) {
        return done(err);
      }
      else if (!page) {
        orm.models.Page.create({ id: relativePath, fingerprint: fingerprint }).done(function(err, page) {
          if (err) {
            return done(err);
          }
          done(null, page);
        });
        return;
      }
      else {
        return done(null, page);
      }
    });
  });
};
