// FIXME: callback.apply or not?  capture _this = this in wrapper?

function slice(args) {
  return Array.prototype.slice.call(args, 1);
}

function noop() {}

var callbacks = {
  DEFAULT_TIMEOUT: 10000,
  timeout: function wrapCallbackInTimeout(callback, wait) {
    if (typeof callback !== 'function') {
      throw new Error('E.timeout expects one argument: callback<Function>');
    }
    wait = void 0 === wait ? callbacks.DEFAULT_TIMEOUT : wait;
    var timeoutErr = new Error('E.timeout had callback timeout')
      , timeout = setTimeout(function() {
          callback(timeoutErr);
        }, wait);

    return function() {
      if (!timeout) {
        return; // noop
      }
      clearTimeout(timeout);
      return callback.apply(this, arguments);
    }
  },

  event: function errorEventBubblesCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('E.event expects one arguments: callback<Function>');
    }
    return callbacks.bubble(callback, noop);
  },

  // sync: like bubble, but automatically calls the callback after immediateCallback returns
  //    E.bubbles(callback, function() { do_something; callback() }) -> E.sync(callback, function() { do_something })
  // maybe rename bubbles to sync and async?

  bubble: function errorBubblesCallback(callback, immediateCallback) {
    if (typeof callback !== 'function' || typeof immediateCallback !== 'function') {
      throw new Error('E.bubble expects two arguments: callback<Function>, immediateCallback<Function>');
    }
    var callbackTwiceErr = new Error('E.bubble callback called twice')
      , called = false;
    return function(err) {
      if (called) {
        throw callbackTwiceErr;
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
    var callbackTwiceErr = new Error('E.throw callback called twice')
      , called = false;
    return function(err) {
      if (called) {
        throw callbackTwiceErr;
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
    var callbackTwiceErr = new Error('E.log callback called twice')
      , called = false;
    return function(err) {
      if (called) {
        throw callbackTwiceErr;
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
    var callbackTwiceErr = new Error('E.exit callback called twice')
      , called = false;
    return function(err) {
      if (called) {
        throw callbackTwiceErr;
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