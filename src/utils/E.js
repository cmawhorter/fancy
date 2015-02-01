function slice(args) {
  return Array.prototype.slice.call(args, 1);
}

function noop() {}

module.exports = {
  bubbles: function errorBubblesCallback(callback) {
    return function(err) {
      if (err) {
        callback(err);
      }
      else {
        callback.apply(this, slice(arguments));
      }
    }
  },

  throws: function errorThrowsCallback(callback) {
    return function(err) {
      if (err) {
        throw err;
      }
      else {
        callback.apply(this, slice(arguments));
      }
    }
  },

  logged: function errorLoggedCallback(callback, logger) {
    return function(err) {
      if (err) {
        logger ? logger(err) : console.error(err);
      }
      else {
        callback.apply(this, slice(arguments));
      }
    }
  },

  exits: function errorExitsCallback(callback, logToConsole) {
    if (typeof callback !== 'function') {
      logToConsole = callback;
      callback = void 0;
    }

    return function(err) {
      if (err) {
        logToConsole && console.log(err);
        process.exit(1);
      }
      else {
        (callback || noop).apply(this, slice(arguments));
      }
    }
  }
};
