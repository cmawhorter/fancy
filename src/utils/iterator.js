module.exports = function(target) {
  return {
    forEach: function(callback) {
      if ('forEach' in target) {
        target.forEach(callback);
      }
      else {
        var keys = Object.keys(target);
        keys.forEach(function(key, index) {
          callback([ key, target[key] ], index, target);
        });
      }
    }
  };
};
