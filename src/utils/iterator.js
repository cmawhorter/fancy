module.exports = function(target) {
  return {
    forEach: function(callback) {
      if (!target) {
        return;
      }
      if ('forEach' in target) {
        target.forEach(callback);
      }
      else {
        var keys = Object.keys(target);
        keys.forEach(function(key, index) {
          if (typeof target[key] === 'object' && 'length' in target[key]) {
            target[key].forEach(function(val) {
              callback([ key, val ], index, target);
            });
          }
          else {
            callback([ key, target[key] ], index, target);
          }
        });
      }
    }
  };
};
