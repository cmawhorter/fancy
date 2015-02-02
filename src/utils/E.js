function slice(args) {
  return Array.prototype.slice.call(args, 1);
}

function noop() {}

var callbacks = {
  bubble: function errorBubblesCallback(callback, immediateCallback) {
    if (typeof callback !== 'function' || typeof immediateCallback !== 'function') {
      throw new Error('E.bubble expects two arguments: callback<Function>, immediateCallback<Function>');
    }
    var called = false;
    return function(err) {
      if (called) {
        throw new Error('E.bubble callback called twice');
      }
      called = true;
      if (err) {
        callback(err);
      }
      else {
        immediateCallback.apply(this, slice(arguments));
      }
    }
  },

  bubbles: null,
  passthru: null,
  ignore: null,

  throw: function errorThrowsCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('E.throw expects one arguments: callback<Function>');
    }
    var called = false;
    return function(err) {
      if (called) {
        throw new Error('E.throw callback called twice');
      }
      called = true;
      if (err) {
        throw err;
      }
      else {
        callback.apply(this, slice(arguments));
      }
    }
  },

  throws: null,

  log: function errorLoggedCallback(callback, logger) {
    if (typeof callback !== 'function') {
      throw new Error('E.log expects one arguments: callback<Function>');
    }
    var called = false;
    return function(err) {
      if (called) {
        throw new Error('E.log callback called twice');
      }
      called = true;
      if (err) {
        logger ? logger(err) : console.error(err);
      }
      else {
        callback.apply(this, slice(arguments));
      }
    }
  },

  logs: null,

  exit: function errorExitsCallback(callback, logToConsole) {
    if (typeof callback !== 'function') {
      logToConsole = callback;
      callback = void 0;
    }
    var called = false;
    return function(err) {
      if (called) {
        throw new Error('E.exit callback called twice');
      }
      called = true;
      if (err) {
        logToConsole && console.log(err);
        process.exit(1);
      }
      else {
        (callback || noop).apply(this, slice(arguments));
      }
    }
  },

  exits: null
};

// aliases
callbacks.bubbles = callbacks.passthru = callbacks.ignore = callbacks.bubble;
callbacks.throws = callbacks.throw;
callbacks.logs = callbacks.log;
callbacks.exits = callbacks.exit;

module.exports = callbacks;
