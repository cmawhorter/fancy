var fs = require('fs');

var ejs = require('ejs')
  , uriTemplates = require('uri-templates')
  , urlPattern = require('url-pattern');

var objectUtil = require('../../utils/object.js');

function filterAndSort(ret, filterFn, sorterFn) {
  ret = ret || [];
  if (filterFn) {
    ret = ret.filter(filterFn);
  }
  if (sorterFn) {
    ret.sort(sorterFn);
  }
  return ret;
}

function valueToText(val) {
  var ret;
  if (null === val || void 0 === val) {
    ret = '';
  }
  else if (typeof val === 'object' && 'length' in val) {
    ret = val.join(', ');
  }
  else if (val.toString) {
    ret = val.toString();
  }
  return ret;
}

function valueToFirst(val) {
  var ret = val;

  if (typeof val === 'object' && 'length' in val) {
    ret = val[0];
  }

  if (null === ret || void 0 === ret) {
    return '';
  }
  else {
    return ret.toString();
  }
}

var helpers = function(ctx, fancy) {
  var core = {
    wrap: function(obj) {
      var content = {
        value: function(k, defaultValue) {
          var ret = objectUtil.retrieve(obj, k);
          return void 0 === ret ? defaultValue : ret;
        },
        text: function(k) {
          var val = content.value(k);
          return valueToText(val);
        },
        first: function(k) {
          var val = content.value(k);
          return valueToFirst(val);
        }
      };

      for (var k in obj) {
        if (!content[k]) {
          content[k] = obj[k];
        }
      }

      return content;
    },

    partial: function(view, vals) {
      vals = vals || {};
      var res = fancy.createResponse(ctx.request.url, vals.page || ctx.page, ctx.request.params);
      for (var k in vals) {
        res[k] = vals[k];
      }
      console.log('partial scope', res);
      if (!/\.ejs$/i.test(view)) {
        view += '.ejs';
      }
      var viewPath = fancy.getView(ctx.page.layout, view);
      var contents = fs.readFileSync(viewPath).toString();
      return ejs.render(contents, {
        locals: res,
        filename: viewPath
      });
    },

    value: function(k, defaultValue) {
      var ret;
      if (k.trim().length) {
        var parts = k.toLowerCase().split('.')
          , ns = parts.shift();
        ret = (ctx[ns] || {})[parts.join('.')];
        // if a page search and it's not found, fall back to a deep search since we don't flatten page data
        if ((ns === 'page' || ns === 'request') && void 0 === ret) {
          var lowest = ctx[ns]
            , search = [];
          for (var i=0; i < parts.length; i++) {
            if (void 0 !== lowest[parts[i]]) {
              lowest = lowest[parts[i]];
            }
            else {
              search.push(parts[i]);
            }
          }
          if (lowest) {
            ret = objectUtil.retrieve(lowest, search.join('.'));
          }
        }
      }
      return void 0 === ret ? defaultValue : ret;
    },

    text: function(k) {
      var val = this.value(k);
      return valueToText(val);
    },

    first: function(k) {
      var val = this.value(k);
      return valueToFirst(val);
    },

    resources: function(type, filterFn, sorterFn) {
      return filterAndSort(this.value('site.resources.' + type), filterFn, sorterFn);
    },

    meta: function(property, filterFn, sorterFn) {
      return filterAndSort(this.value('site.meta.' + property), filterFn, sorterFn);
    },

    relationships: function(property, filterFn, sorterFn) {
      return filterAndSort(this.value('site.relationships.' + property), filterFn, sorterFn);
    },

    'if': {
      active: function(url, str, elseStr) {
        var ret;
        ret = urlPattern.newPattern(this.value('request.url')).match(url) ? str : elseStr || '';
        if (typeof ret === 'function') {
          ret();
        }
        else {
          return ret;
        }
      },

      // matches: function(url, str, elseStr) {
      //   var route = ((ctx.page || {}).properties || {}).route;
      //   if (!route) {
      //     return elseStr;
      //   }
      //   else if (url == route) {
      //     return str;
      //   }
      //   else if (urlPattern.newPattern(route).match(url)) {
      //     return str;
      //   }
      //   else {
      //     return elseStr;
      //   }
      // }
    }
  };

  core.utils = {
    // FIXME: this completely ignores most languages in the world... better slug libs exist.  which one did i use last time?
    slug: function(str) {
      return (str || '').toLowerCase().trim().replace(/[^\w\W]|\s+/g, '-').replace(/\-\-+/g, '-').replace(/^\-+|\-+$/g, '');
    },

    // takes a single k/v dict and returns the parts for easy use
    eachKey: function(obj, callback) {
      if (obj) {
        var k = Object.keys(obj)[0];
        callback(k, obj[k]);
      }
      else {
        callback();
      }
    },

    forEach: function(obj, callback) {
      for (var k in obj) {
        callback(obj[k], k);
      }
    },

    once: function(key, fn) {
      // TODO: stub. fn gets exec once and the result cached under key.  runs once per build.
    },

    relative: function(mergeVals) {
      mergeVals = mergeVals || {};
      if (!core.first('page.urlTemplate')) return core.value('request.url');

      var templateValues = Object.create(core.value('request.params', {}));
      for (var k in mergeVals) {
        templateValues[k] = mergeVals[k];
      }

      var templateUrl = core.first('page.urlTemplate');
      if ('/' !== templateUrl.trim()[0] && /\s*\w.*\?.*\:.*/.test(templateUrl)) { // conditional, eval it
        console.log('url template needs eval', templateUrl);
        templateUrl = (function(template, ctx) {
          return eval(templateUrl);
        })(templateValues, ctx);
      }

      console.log('url template is', templateUrl);

      var url = uriTemplates(templateUrl).fillFromObject(templateValues);
      // console.log('URI', page.urlTemplate || page.route, url);

      return url;
    }
  };


  return core;
};

module.exports = helpers;
