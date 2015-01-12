module.exports = function(target) {
  console.log('iterator', target);
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
          callback([ key, target[key] ], index, target);
        });
      }
    }
  };
};
