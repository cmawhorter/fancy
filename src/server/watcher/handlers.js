var config = require('../../config/config.js');

function toHash(result, locale) {
  return result.map(function(element) {
    return element.getAsHash(locale);
  });
}

module.exports = function(site) {
  return {
    find: function(data, reply) {
      var pages = site.getPageForUrl(data.url, config.data.resolution.toLowerCase().trim());
      if (pages.length === 0) {
        reply({ error: 404, message: 'Not Found' });
      }
      else if (pages.length === 1 || config.data.collisions) {
        var page = pages[0]
          , properties = page.getAsHash(data.locale)
          , resources = page.getProperty('resource')
          , relatedResources = {};
        if (resources.length) {
          for (var i=0; i < resources.length; i++) {
            var resource = resources[i];
            relatedResources[resource] = site.findByProperty('resource', resource);
          }
        }
        reply({
            properties: properties
          , resources: relatedResources
          , filepath: page.relativePath
        });
      }
      else {
        reply({
          error: 300,
          message: 'Multiple Pages Found:\n\n' + pages.map(function(element) {
            return element.relativePath;
          }).join('\n')
        });
      }
    },

    resources: function(data, reply) {
      var pages = site.findByAny('resource');
      Object.keys(pages).forEach(function(element) {
        pages[element] = toHash(pages[element], data.locale);
      });
      reply({ pages: pages });
    },

    matching: function(data, reply) {
      var pages = site.findByProperty(data.key, data.value || eval('(' + data.fn + ')'));
      reply({ pages: toHash(pages, data.locale) });
    },

    urls: function(data, reply) {
      var urls = site.urls(true, data.locale, config.data.routes != 'explicit');
      if (config.strict && urls.indexOf(null) > -1) {
        reply({ error: 500, message: 'Unreachable content exists and strict mode is enabled' });
      }
      else {
        reply({ urls: urls });
      }
    }
  }
};
