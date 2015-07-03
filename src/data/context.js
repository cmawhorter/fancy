var fs = require('fs')
  , path = require('path');

var _ = require('lodash')
  , async = require('async')
  , he = require('he')
  , ejs = require('ejs');

var Page = require('./context/page.js')
  , Collection = require('./context/collection.js');

var fingerprint = require('../utils/fingerprint.js');

// https://github.com/tj/ejs#options
var RESERVED_KEYS = [ 'cache', 'filename', 'scope', 'debug', 'compileDebug', 'client', 'open', 'close' ];

function EmptyModule() { return {}; }

function Context(viewPath, themeModule, extensions, yieldHandler, locals) {
  var _this = this;
  this.__uses = [];
  this.__usesResolved = false;
  this.__partialContextCache = {};

  locals = locals || {};
  locals.page = locals.page || {};
  locals.request = locals.request || {};
  locals.config = locals.config || {};
  locals.env = locals.env || {};
  locals.globals = locals.globals || {};

  this.viewPath = viewPath;

  this.config = locals.config;

  this.resources = null;
  this.current = this.page = locals.page instanceof Page ? locals.page : new Page(locals.page);
  this.request = locals.request;
  this.env = locals.env;
  this.globals = locals.globals;

  if (locals.resources && Array.isArray(locals.resources)) {
    this.resources = new Collection(locals.resources);
  }

  this.themeModule = themeModule;
  this.theme = null;

  this.extensionModules = extensions;
  this.extensions = {};

  this.yieldHandler = yieldHandler || function(yieldUrl) {
    console.warn('No yield handler! Received %s ', yieldUrl);
  };

  this.parentContext = null;
  this.childContexts = [];

  // import other locals
  for (var k in locals) {
    var key = k.toLowerCase().trim();
    if (this._validKey(key)) {
      this[key] = locals[key];
    }
  }
}

Context.prototype._validKey = function(key) {
  return !(key in this) && RESERVED_KEYS.indexOf(key) < 0;
};

Context.prototype.init = function() {
  var _this = this;

  // init theme with this context
  _this.theme = (_this.themeModule || EmptyModule)(_this);

  // init extensions with this context
  Object.keys(_this.extensionModules).forEach(function(element) {
    _this.extensions[element] = (_this.extensions[element] || EmptyModule)(_this);
  });

  // FIXME: enable? or maybe just conditionally deepFreeze properties?
  // disabling now so that commitUsing can work
  // Object.freeze(_this);
};

Context.prototype.clone = function(locals) {
  locals = locals || {};
  locals.page = locals.page || this.page;
  locals.request = locals.request || this.request;
  locals.config = locals.config || this.config;
  locals.env = locals.env || this.env;
  locals.globals = locals.globals || this.globals;
  var context = new Context(this.viewPath, this.themeModule, this.extensions, this.yieldHandler, locals);
  context.current = this.current;
  context.parentContext = this;
  this.childContexts.push(context);
  context.usingResolver = this.usingResolver;
  context.__usesResolved = this.__usesResolved;
  context.init();
  return context;
};

Context.prototype.partial = function(partial, locals) {
  locals = locals || {};
  if (!/\.ejs$/i.test(partial)) {
    partial += '.ejs';
  }
  var viewPath = path.join(this.viewPath, 'partials', partial)
    , viewContents = fs.readFileSync(viewPath).toString()
    , uid = Context.uidPartial(partial, locals)
    , childContext
    , html;

  childContext = this.__partialContextCache[uid] = this.__partialContextCache[uid] || this.clone(locals);

  html = ejs.render(viewContents, {
      locals: childContext
    , filename: viewPath
  });

  this.__uses += childContext.__uses;

  return html;
};

Context.prototype.uses = function(key, value) {
  if (this.__usesResolved) { // been there done that.  noop this.
    return {
      as: function(){}
    };
  }
  else {
    var _this = this;
    var result = {}
      , placeholder = new Collection([])
      , contextKey = 'using:' + (typeof value === 'function' ? key : value)
      , unaliasedRef = {
          contextKey: contextKey,
          key: key,
          value: value,
          result: result
        }
      , task;

    _this[contextKey] = placeholder; // avoid undefined/null errors
    _this.__uses.push(unaliasedRef);
    return {
      as: function(alias) {
        _this[alias] = placeholder; // avoid undefined/null errors
        delete _this[contextKey]; // cleanup.  we're aliasing.
        var unaliasedIndex = _this.__uses.indexOf(unaliasedRef);
        if (unaliasedIndex > -1) {
          _this.__uses.splice(unaliasedIndex, 1);
        }
        _this.__uses.push({
          contextKey: alias,
          key: key,
          value: value,
          result: result
        });
      }
    };
  }
};

Context.prototype.resolve = function(callback) {
  var _this = this
    , tasks = [];
  _this.__uses.forEach(function(using) {
    tasks.push(function(taskCallback) {
      _this.usingResolver(using, taskCallback);
    });
  });
  // propagate down tree
  _this.childContexts.forEach(function(element) {
    tasks.push(function(taskCallback) {
      element.resolve(taskCallback);
    });
  });
  async.parallel(tasks, function(err) {
    if (err) {
      return callback(err);
    }
    _this._commitUsing();
    callback();
  });
};

Context.prototype._commitUsing = function() {
  var _this = this;
  _this.__usesResolved = true;
  _this.__uses.forEach(function(using) {
    if (_this._validKey(using.contextKey)) {
      // FIXME: decide on whether third parameter should be this.current, this.page or neither.  until then don't pass either to not create backwards compat problem
      _this[using.contextKey] = new Collection((using.result || {}).retrieved || []);
    }
    else {
      throw new Error('Invalid using key "' + using.contextKey + '"');
    }
  });
};

Context.prototype.yield = function(yieldUrl) {
  this.yieldHandler(yieldUrl);
};

Context.prototype.print = function() {
  var html = '';
  for (var i=0; i < arguments.length; i++) {
    html += this[arguments[i] instanceof Error ? 'printError' : 'printValue'](arguments[i]);
  }
  return html;
};

Context.prototype.printError = function(err) {
  return '<pre>' + he.encode('' + err.stack) + '</pre>';
};

Context.prototype.printValue = function(val) {
  return '<pre>' + he.encode('' + JSON.stringify(val, null, 2)) + '</pre>';
};

Context.prototype.toJSON = function() {
  var obj = {};
  for (var k in this) {
    if (k !== 'childContexts' && k !== 'parentContext' && 0 !== k.indexOf('__')) {
      obj[k] = this[k];
    }
  }
  return obj;
};

Context.uidPartial = function(path, locals) {
  return fingerprint.sync(path + fingerprint.sync(locals));
};

module.exports = function ContextFactoryGenerator(fancyGlobals) {
  var viewPath = fancyGlobals.viewPath
    , yieldHandler = fancyGlobals.yieldHandler
    , config = fancyGlobals.config
    , env = fancyGlobals.env
    , globals = fancyGlobals.globals
    , liveReloadPort = fancyGlobals.liveReloadPort || 35729
    , themeModule = null
    , extensions = [];

  if (fancyGlobals.themePath) {
    var themeSupportPath = require.resolve(fancyGlobals.themePath);
    if (require.cache[themeSupportPath]) {
      delete require.cache[themeSupportPath];
    }
    themeModule = require(themeSupportPath);
  }

  if (fancyGlobals.extensions && Array.isArray(fancyGlobals.extensions) && fancyGlobals.extensions.length) {
    fancyGlobals.extensions.forEach(function(module) {
      var modulePath = require.resolve(module)
        , moduleName = path.basename(path.dirname(modulePath));
      if (require.cache[modulePath]) {
        delete require.cache[modulePath];
      }
      extensions[moduleName] = require(modulePath);
    });
  }

  return function ContextFactory(filepath, page, request, resources) {
    page.__filepath = filepath;
    var context = new Context(viewPath, themeModule, extensions, yieldHandler, {
        page: page
      , resources: resources
      , request: request
      , config: config
      , env: env
      , globals: globals
      , livereloadport: liveReloadPort
    });
    context.init();
    return context;
  }
};
