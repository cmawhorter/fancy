var _ = require('lodash')
  , he = require('he');

var Page = require('./context/page.js');

// https://github.com/tj/ejs#options
var RESERVED_KEYS = [ 'cache', 'filename', 'scope', 'debug', 'compileDebug', 'client', 'open', 'close' ];

function Context(page, request, theme, extensions, fancyGlobals, yieldHandler) {
  page = page || {};
  request = request || {};
  theme = theme || {};
  extensions = extensions || {};
  fancyGlobals = fancyGlobals || {};

  this.yieldHandler = yieldHandler || function(yieldUrl) {
    console.warn('No yield handler! Received %s ', yieldUrl);
  };

  this.config = fancyGlobals.config;

  this.current = this.page = new Page(page);
  this.request = request;
  this.env = fancyGlobals.env;
  // this.site = {}; // removed

  this.theme = (theme || []).map(function(themeModule) {
    var modulePath = require.resolve(themeModule);
    if (require.cache[modulePath]) {
      delete require.cache[modulePath];
    }
    return require(modulePath);
  });

  this.extensions = (extensions || []).map(function(extensionModule) {
    var modulePath = require.resolve(extensionModule);
    if (require.cache[modulePath]) {
      delete require.cache[modulePath];
    }
    return require(modulePath);
  });

  Object.freeze(this);
}

Context.prototype.partial = function(partial, locals) {
  vals = vals || {};
  var res = fancy.createResponse(ctx.request.url, vals.page || ctx.page, ctx.request.params);
  for (var k in vals) {
    res[k] = vals[k];
  }
  // console.log('partial scope', res);
  if (!/\.ejs$/i.test(view)) {
    view += '.ejs';
  }
  var viewPath = fancy.getView(ctx.page.layout, view);
  var contents = fs.readFileSync(viewPath).toString();
  return ejs.render(contents, {
    locals: res,
    filename: viewPath
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

module.exports = Context;
