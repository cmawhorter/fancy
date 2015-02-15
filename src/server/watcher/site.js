var path = require('path');

var mkdirp = require('mkdirp');

var Voyeur = require('voyeur');

var Properties = require('../../data/properties.js')
  , Provider = require('../../data/provider.js')
  , parsers = require('../../content-parsers/parsers.js');

var E = require('../../utils/E.js')
  , tell = require('../../utils/tell.js')
  , log = require('../../utils/log.js');

function Site(dataPath, providers, onChanged) {
  var _this = this;
  var dbDest = '.fancy';
  this.dataPath = path.normalize(dataPath + '/');
  this.onChanged = onChanged || function(){};
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
        _this.onChanged(properties.getProperty('route')[0]);
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
        _this.onChanged(properties.getProperty('route')[0]);
      })
      .on('item:changed', function(properties) {
        // console.log('provider changed -> %s', properties.relativePath);
        _this.onChanged(properties.getProperty('route')[0]);
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
    _this.onChanged(item.data('properties').getProperty('route')[0]);
  });

  var targetPath = path.join(this.dataPath, '/**/*.@(' + parsers.available.join('|') + ')');
  var watchOptions = { ignored: '**/*.html/*/**' };
  this.voyeur.start(targetPath, watchOptions);

  return this;
};

Site.prototype.forEach = function(fn) {
  this.forEachInDb(function(relativePath, item) {
    var properties = item.data('properties');
    fn(relativePath, properties);
  });
  this.forEachInProviders(fn);
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

Site.prototype.aggregate = function(propertyName) {
  var result = [];
  this.forEach(function(relativePath, properties) {
    var props = properties.getProperty(propertyName);
    if (props.length) {
      console.log('\t-> props', props);
      for (var j=0; j < props.length; j++) {
        var prop = props[j];
        if (result.indexOf(prop) < 0) {
          result.push(prop);
          console.log('\t\t-> discovered prop %s', prop);
        }
      }
    }
  });
  return result;
};

Site.prototype.findByAny = function(propertyName) {
  var possibilities = this.aggregate(propertyName)
    , pages = {};
  console.log('findByAny %s', propertyName);
  for (var i=0; i < possibilities.length; i++) {
    var possibility = possibilities[i];
    console.log('\t-> possibility %s', possibility);
    pages[possibility] = this.findByProperty(propertyName, possibility);
  }
  return pages;
};

Site.prototype.findByProperty = function(propertyName, propertyValue) {
  var fnMatcher = typeof propertyValue === 'function' ? propertyValue : function(properties) {
    return properties.hasMatchingProperty(propertyName, propertyValue);
  };

  var pages = [];
  this.forEach(function(relativePath, properties) {
    if (fnMatcher.call(properties, properties)) {
      pages.push(properties);
    }
  });
  return pages;
};

Site.prototype.getPageForUrl = function(url) {
  var pages = this.findByProperty('route', url);
  if (!pages.length) { // no direct match found.  urlPattern matching
    // console.log('\t-> No exact matching routes');
    this.forEach(function(relativePath, properties) {
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
