var uriTemplates = require('uri-templates');

module.exports = function(ctx) {
  return {
    resources: function(type) {
      return ctx.site.resources[type] || [];
    },



    utils: {
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
