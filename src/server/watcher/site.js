var path = require('path');

var mkdirp = require('mkdirp');

var Voyeur = require('voyeur');

var Properties = require('../../data/properties.js')
  , Provider = require('../../data/provider.js')
  , parsers = require('../../content-parsers/parsers.js');

var E = require('../../utils/E.js')
  , tell = require('../../utils/tell.js')
  , log = require('../../utils/log.js');

function Site(dataPath, providers) {
  var _this = this;
  var dbDest = '.fancy';
  this.dataPath = path.normalize(dataPath + '/');
  this.provided = {};
  this.voyeur = new Voyeur({
    saveDestination: path.join(dbDest, 'db.json'),
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

  (providers || []).forEach(function(providerPath) {
    var provider = new Provider('some name based on provider path')
    provider
      .on('item:created', function(properties) {
        // console.log('provider created -> %s', properties.relativePath);
        if (!_this.provided[properties.relativePath]) {
          _this.provided[properties.relativePath] = properties;
        }
        else {
          console.warn('Provider path collision: %s exists', properties.relativePath);
        }
      })
      .on('item:changed', function(properties) {
        // console.log('provider changed -> %s', properties.relativePath);
      })
      .on('item:removed', function(properties) {
        // console.log('provider removed -> %s', properties.relativePath);
        if (_this.provided[properties.relativePath]) {
          delete _this.provided[properties.relativePath];
        }
        else {
          console.warn('Provider path %s does not exist', properties.relativePath);
        }
      });
    require(providerPath)({
      create: function(uid, data) {
        provider.create(uid, data);
      },
      update: function(uid, data) {
        provider.update(uid, data);
      },
      remove: function(uid) {
        provider.remove(uid, data);
      }
    });
  });

  mkdirp.sync(dbDest);
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

  this.voyeur.on('item:imported', function(item) {
    // re-initialize saved data
    item.data('properties', Properties.create(item.path, item.data('properties').data));
  });

  var targetPath = path.join(this.dataPath, '/**/*.@(' + parsers.available.join('|') + ')');
  var watchOptions = { ignored: '**/*.html/*/**' };
  this.voyeur.start(targetPath, watchOptions);

  return this;
};

Site.prototype.forEachInDb = function(fn) {
  var db = this.voyeur.all();
  for (var relativePath in db) {
    fn(relativePath, db[relativePath]);
  }
};

Site.prototype.forEachInProviders = function(fn) {
  for (var relativePath in this.provided) {
    fn(relativePath, this.provided[relativePath]);
  }
};

Site.prototype.findByProperty = function(propertyName, propertyValue) {
  var pages = [];
  this.forEachInDb(function(relativePath, item) {
    var properties = item.data('properties');
    if (properties && properties.hasMatchingProperty(propertyName, propertyValue)) {
      pages.push(properties);
    }
  });
  this.forEachInProviders(function(relativePath, properties) {
    if (properties.hasMatchingProperty(propertyName, propertyValue)) {
      pages.push(properties);
    }
  });
  return pages;
};

Site.prototype.getPageForUrl = function(url) {
  var pages = this.findByProperty('route', url);
  if (!pages.length) { // no direct match found.  urlPattern matching
    // console.log('\t-> No exact matching routes');
    this.forEachInDb(function(relativePath, item) {
      var properties = item.data('properties');
      // console.log('\t-> does page %s match?', properties.relativePath);
      if (properties && properties.getParamsForUrl(url)) {
        pages.push(properties);
      }
    });
    this.forEachInProviders(function(relativePath, properties) {
      // console.log('\t-> does provider %s match?', properties.relativePath, properties.getProperty('route'));
      if (properties.getParamsForUrl(url)) {
        pages.push(properties);
      }
    });
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
