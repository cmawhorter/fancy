var fs = require('fs')
  , path = require('path');

var _ = require('lodash')
  , he = require('he')
  , ejs = require('ejs');

var Page = require('./context/page.js')
  , Resources = require('./context/resources.js');

// https://github.com/tj/ejs#options
var RESERVED_KEYS = [ 'cache', 'filename', 'scope', 'debug', 'compileDebug', 'client', 'open', 'close' ];

function EmptyModule() { return {}; }

function Context(viewPath, theme, extensions, yieldHandler, locals) {
  var _this = this;
  locals = locals || {};
  locals.page = locals.page || {};
  locals.request = locals.request || {};
  locals.config = locals.config || {};
  locals.env = locals.env || {};

  this.viewPath = viewPath;

  this.config = locals.config;

  this.resources = null;
  this.current = this.page = locals.page instanceof Page ? locals.page : new Page(locals.request, locals.page);
  this.request = locals.request;
  this.env = locals.env;
  // this.site = {}; // removed

  if (locals.resources && Array.isArray(locals.resources)) {
    this.resources = new Resources(locals.request, locals.resources);
  }

  this.themeModule = locals.theme;
  this.theme = null;

  this.extensionModules = extensions;
  this.extensions = {};

  this.yieldHandler = yieldHandler || function(yieldUrl) {
    console.warn('No yield handler! Received %s ', yieldUrl);
  };

  this.parentContext = null;

  // import other locals
  for (var k in locals) {
    var key = k.toLowerCase().trim();
    if (!(k in this) && RESERVED_KEYS.indexOf(key) < 0) {
      this[key] = locals[k];
    }
  }
}

Context.prototype.init = function() {
  var _this = this;

  // init theme with this context
  _this.theme = (_this.themeModule || EmptyModule)(_this);

  // init extensions with this context
  Object.keys(_this.extensionModules).forEach(function(element) {
    _this.extensions[element] = (_this.extensions[element] || EmptyModule)(_this);
  });

  Object.freeze(_this);
};

Context.prototype.clone = function(locals) {
  locals = locals || {};
  locals.page = locals.page || this.page;
  locals.request = locals.request || this.request;
  locals.config = locals.config || this.config;
  locals.env = locals.env || this.env;
  var context = new Context(this.viewPath, this.theme, this.extensions, this.yieldHandler, locals);
  context.current = this.current;
  context.parentContext = this;
  context.init();
  return context;
};

Context.prototype.partial = function(partial, locals) {
  locals = locals || {};
  if (!/\.ejs$/i.test(partial)) {
    partial += '.ejs';
  }
  console.log('this.viewPath', this.viewPath);
  var viewPath = path.join(this.viewPath, 'partials', partial)
    , viewContents = fs.readFileSync(viewPath).toString();
  return ejs.render(viewContents, {
      locals: this.clone(locals)
    , filename: viewPath
  });
};

Context.prototype.yield = function(yieldUrl) {
  this.yieldHandler(yieldUrl);
};

Context.prototype.print = function() {
  var html = '';
  for (var i=0; i < arguments.length; i++) {
    html += '<pre>' + he.encode(JSON.stringify(arguments[i], null, 2)) + '</pre>';
  }
  return html;
};

module.exports = function ContextFactoryGenerator(fancyGlobals) {
  var viewPath = fancyGlobals.viewPath
    , yieldHandler = fancyGlobals.yieldHandler
    , config = fancyGlobals.config
    , env = fancyGlobals.env
    , theme = null
    , extensions = [];

  if (fancyGlobals.theme) {
    var themeSupportPath = require.resolve(fancyGlobals.theme);
    if (require.cache[themeSupportPath]) {
      delete require.cache[themeSupportPath];
    }
    theme = require(themeSupportPath);
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
    var context = new Context(viewPath, theme, extensions, yieldHandler, {
        page: page
      , resources: resources
      , request: request
      , config: config
      , env: env
    });
    context.init();
    return context;
  }
};
