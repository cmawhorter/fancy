function slice(args) {
  return Array.prototype.slice.call(args, 1);
}

module.exports = {
  bubbles: function errorBubblesCallback(callback) {
    return function(err) {
      if (err) {
        callback(err);
        return;
      }
      callback.apply(this, slice(arguments));
    }
  },

  throws: function errorThrowsCallback(callback) {
    return function(err) {
      if (err) {
        throw err;
        return;
      }
      callback.apply(this, slice(arguments));
    }
  },

  logged: function errorLoggedCallback(callback, logger) {
    return function(err) {
      if (err) {
        logger ? logger(err) : console.error(err);
        return;
      }
      callback.apply(this, slice(arguments));
    }
  }
};
