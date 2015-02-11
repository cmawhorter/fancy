var path = require('path');

var Voyeur = require('voyeur');

var Properties = require('../../data/properties.js')
  , parsers = require('../../content-parsers/parsers.js');

var E = require('../../utils/E.js')
  , tell = require('../../utils/tell.js')
  , log = require('../../utils/log.js');

function Site(dataPath) {
  this.dataPath = path.normalize(dataPath + '/');
  this.voyeur = new Voyeur({
    defaultProvider: function(item, callback) {
      console.log('defaultProvider', item);
      parsers.process(item.path, null, function(err, properties) {
        if (err) {
          callback(err);
          return;
        }
        console.log('\t-> %s = %j', item.path, properties.getProperty('route'));
        item.data('properties', properties);
        callback(null);
      });
    },
    logger: {
        info: console.info
      , warn: console.warn
      , error: console.error
      , debug: console.log
      , log: console.log
    }
  });
}

Site.prototype.start = function() {
  var _this = this;

  [
    'item:imported',
    'item:created',
    'item:current',
    'item:expired',
    'item:removed',

    // 'watcher:add',
    // 'watcher:change',
    // 'watcher:delete',
  ].forEach(function(evt) {
    _this.voyeur.on(evt, function(item) {
      if (item) {
        console.log('Event (%s): %s', evt, item.path, item.toJSON());
      }
      else {
        console.log('Event (%s)', evt);
      }
    });
  });

  _this.voyeur
    .start(path.join(_this.dataPath, '/**/*.@(' + parsers.available.join('|') + ')'), { ignored: '**/*.html/*/**' })
    .on('item:imported', function(item) {
      // re-initialize saved data
      item.data('properties', Properties.create(item.path, item.data('properties')));
    });

  return _this;
};

Site.prototype.findByProperty = function(propertyName, propertyValue) {
  var pages = []
    , db = this.voyeur.all();
  for (var relativePath in db) {
    var properties = db[relativePath].data('properties');
    if (properties && properties.hasMatchingProperty(propertyName, propertyValue)) {
      pages.push(properties);
    }
  }
  return pages;
};

Site.prototype.getPageForUrl = function(url) {
  var pages = this.findByProperty('route', url)
    , db = this.voyeur.all();
  // console.log('getPageForUrl', url, pages);

  if (!pages.length) { // no direct match found.  urlPattern matching
    // console.log('\t-> No exact matching routes');
    for (var relativePath in db) {
      var properties = db[relativePath].data('properties');
      // console.log('\t-> does page %s match?', page.relativePath);
      if (properties && properties.getParamsForUrl(url)) {
        pages.push(properties);
      }
    }
  }

  return Site.filterPagesByRoute(pages || []);
};

Site.filterPagesByRoute = function(pages, strict) {
  // console.log('Reducing matching routes...');
  var preferredPages = pages.filter(function(page) {
    // console.log('\t-> Page %s has property preferred? %s', page.relativePath, page.hasProperty('preferred'));
    return page && page.hasProperty('preferred');
  });
  if (pages.length > 1 && !preferredPages.length && strict) {
    console.log('Multiple matching pages:', pages);
    throw new Error('Strict Mode: Multiple pages match url, with none marked preferred');
  }
  if (!preferredPages.length) preferredPages = pages;

  var nonproviderPages = preferredPages.filter(function(page) {
    // console.log('\t-> Page %s is not provider? %s', page.relativePath, 0 !== page.relativePath.indexOf('provider:'));
    return page && 0 !== page.relativePath.indexOf('provider:');
  });
  if (!nonproviderPages.length) nonproviderPages = preferredPages;

  // console.log('\t-> Matches: ', nonproviderPages.length);

  if (nonproviderPages.length) {
    return nonproviderPages[0];
  }
  else {
    return null;
  }
};

module.exports = Site;