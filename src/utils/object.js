var opts = require('./options.js');

function keyEscape(str) {
  return str.replace(/\"/g, '\\"');
}

function keyInsensitive(obj, key) {
  if (obj && key) {
    key = key.toLowerCase();
    obj = obj || {};
    for (var k in obj) {
      if (k.toLowerCase() == key) {
        return obj[k];
      }
    }
  }
  return;
}

module.exports = {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze#Examples
  deepFreeze: function(o) {
    var prop, propKey;
    // console.log('deepFreezing', o);
    Object.freeze(o); // First freeze the object.
    for (propKey in o) {
      prop = o[propKey];
      if (!o.hasOwnProperty(propKey) || !(typeof prop === 'object') || void 0 === prop || null === prop || Object.isFrozen(prop)) {
        // If the object is on the prototype, not an object, or is already frozen,
        // skip it. Note that this might leave an unfrozen reference somewhere in the
        // object if there is an already frozen object containing an unfrozen object.
        continue;
      }

      this.deepFreeze(prop); // Recursively call deepFreeze.
    }
  },

  flatten: function(obj, passedOptions) {
    var options = opts.extend(passedOptions, {
      skipArrays: true,
      cloneArrays: true, // if skipArrays = true and clone arrays is true, then slice array
      maximumObjects: Infinity,
      separator: '.',
      allowSeparatorInKey: true,
      keyPrefix: null,
      keyTransformStrategy: String.prototype.toLowerCase,
      freeze: true,
      valueHandler: null // function(value, flattenedKey, key, parentObject) { return value }
    });
    if (!options) {
      throw new Error('Invalid options passed');
    }
    if (toString.call(obj) !== '[object Object]') {
      return obj;
    }
    var objs = [ [options.keyPrefix, obj] ]
      , ret = {}
      , resource;
    while (objs.length && --options.maximumObjects) {
      resource = objs.shift();
      for (var k in resource[1]) {
        var subKey = options.keyTransformStrategy.call(k)
          , childKey = (resource[0] ? [resource[0], subKey] : [subKey]).join(options.separator)
          , childObj = resource[1][k]
          , childType = toString.call(childObj);
        if (!options.allowSeparatorInKey && subKey.indexOf(options.separator) > -1) {
          throw new Error('Flatten Object: Child key "' + childKey + '" contains separator "' + options.separator + '"');
        }
        if (childType === '[object Object]' || (!options.skipArrays && childType === '[object Array]')) {
          objs.push([ childKey, childObj ]);
        }
        else {
          if (options.skipArrays && childType === '[object Array]') {
            if (options.cloneArrays) {
              childObj = childObj.slice();
            }
            if (options.freeze) {
              Object.freeze(childObj);
            }
          }
          ret[childKey] = options.valueHandler ? options.valueHandler(childObj, childKey, k, resource[1]) : childObj;
        }
      }
    }
    if (options.freeze) {
      Object.freeze(ret);
    }
    return ret;
  },

  retrieve: function(obj, k) {
    var ret;
    if (k.trim().length) {
      var parts = k.split('.')
        , lookup = 'obj';

      for (var i=0; i< parts.length; i++) {
        lookup = 'keyInsensitive(' + lookup + ', "' + keyEscape(parts[i]) + '")';
      }

      ret = eval(lookup);
      if (typeof ret === 'object' && lookup.length) {
        for (var k in ret) {
          if (k.toLowerCase().trim() === lookup) {
            ret = ret[k];
            break;
          }
        }
      }
    }
    return ret;
  },
};
