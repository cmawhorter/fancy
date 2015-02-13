var EventEmitter = require('events').EventEmitter;

var Properties = require('./properties.js');

function Provider(name) {
  var _this = this;
  var _resources = {}
    , _name = name
    , _prefix = Provider.PREFIX + _name + ':';

  Object.defineProperty(this, 'name', {
    get: function() {
      return _name;
    }
  });

  Object.defineProperty(this, 'prefix', {
    value: function() {
      return _prefix;
    }
  });

  Object.defineProperty(this, 'create', {
    value: function(uid, data) {
      var properties = Properties.create(_prefix + uid, data)
      _resources[uid] = properties;
      _this.emit('item:created', properties);
    }
  });

  Object.defineProperty(this, 'update', {
    value: function(uid, data) {
      var properties = _resources[uid];
      properties.data = data;
      this.emit('item:changed', properties);
    }
  });

  Object.defineProperty(this, 'remove', {
    value: function(uid) {
      var properties = _resources[uid];
      delete _resources[uid];
      this.emit('item:removed', properties);
    }
  });

  Object.defineProperty(this, 'length', {
    get: function() {
      return Object.keys(_resources).length;
    }
  });
}

Provider.prototype = Object.create(EventEmitter.prototype);

Provider.PREFIX = 'provider:';

module.exports = Provider;
