var uriTemplates = require('uri-templates')
  , urlPattern = require('url-pattern');

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

module.exports = function(ctx) {
  return {
    resources: function(type, filterFn, sorterFn) {
      return filterAndSort(ctx.site.resources[type], filterFn, sorterFn);
    },

    meta: function(property) {
      return filterAndSort(ctx.site.meta[property], filterFn, sorterFn);
    },

    relationships: function(property, propertyValue, filterFn, sorterFn) {
      var ret = ctx.site.relationships[property] || {};
      if (propertyValue) {
        ret = ret[propertyValue];
      }
      return filterAndSort(ret, filterFn, sorterFn);
    },

    'if': {
      active: function(url, str, elseStr) {
        var ret;
        ret = urlPattern.newPattern(ctx.url).match(url) ? str : elseStr || '';
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
    },

    utils: {
      // FIXME: this completely ignores most languages in the world... better slug libs exist.  which one did i use last time?
      slug: function(str) {
        return (str || '').toLowerCase().trim().replace(/[^\w\W]|\s+/g, '-').replace(/\-\-+/g, '-').replace(/^\-+|\-+$/g, '');
      },

      // takes a single k/v dict and returns the parts for easy use
      each: function(obj, callback) {
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
        if (!ctx.page.urltemplate) return ctx.url;

        var templateValues = Object.create(ctx.params);
        for (var k in mergeVals) {
          templateValues[k] = mergeVals[k];
        }

        var templateUrl = ctx.page.urltemplate;
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
    }
  };
};
