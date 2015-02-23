var path = require('path');

var mkdirp = require('mkdirp')
  , Voyeur = require('voyeur');

var Properties = require('../../data/properties.js')
  , Provider = require('../../data/provider.js')
  , Page = require('../../data/context/page.js')
  , parsers = require('../../content-parsers/parsers.js');

var E = require('../../utils/E.js')
  , tell = require('../../utils/tell.js')
  , log = require('../../utils/log.js')
  , file = require('../../utils/file.js');

function Site(dataPath, providers, onChanged) {
  var _this = this;
  var dbDest = '.fancy';
  this.dataPath = path.normalize(dataPath);
  this.onChanged = onChanged || function(){};
  this.provided = {};
  this.log = log.child({ site: this });
  this.voyeur = new Voyeur({
    saveDestination: path.join(dbDest, 'db.json'),
    defaultProvider: function(item, callback) {
      parsers.process(item.path, null, function(err, properties) {
        if (err) {
          callback(err);
          return;
        }
        item.data('properties', properties);
        _this._changed(properties);
        callback(null);
      });
    },
    logger: null
  });

  for (var i=0; i < providers.length; i++) {
    this.loadProvider(providers[i]);
  }

  mkdirp.sync(dbDest);
}

Site.prototype._changed = function(properties, label) {
  this.log.trace({ properties: properties }, label || 'file reloaded');
  this.onChanged(properties.getProperty('route')[0]);
};

Site.prototype.start = function(filetypes, callback) {
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
      var evtName = 'disk -> ' + evt;
      _this.log.debug(evtName);
      _this.log.trace({ diskItem: item }, evtName);
    });
  });

  this.voyeur.on('item:imported', function(item) {
    // re-initialize saved data
    var rel = path.relative(process.cwd(), item.path);
    item.data('properties', Properties.create(rel, item.data('properties').data));
    _this._changed(item.data('properties'));
  });

  var targetPath = path.join(this.dataPath, '/**/*.@(' + filetypes.join('|') + ')');
  var watchOptions = { ignored: '**/*.html/*/**' };
  this.voyeur.start(targetPath, watchOptions, callback);

  return this;
};

Site.prototype.count = function() {
  return Object.keys(this.voyeur.all()).length + Object.keys(this.provided).length;
};

Site.prototype.loadProvider = function(providerPath) {
  var _this = this;
  var provider = new Provider(providerPath);
  provider
    .on('item:created', function(properties) {
      var evt = 'provider -> item:created';
      _this.log.debug(evt);
      if (!_this.provided[properties.relativePath]) {
        _this.provided[properties.relativePath] = properties;
      }
      else {
        console.warn('Provider path collision: %s exists', properties.relativePath);
      }
      _this._changed(properties, evt);
    })
    .on('item:changed', function(properties) {
      var evt = 'provider -> item:changed';
      _this.log.debug(evt);
      _this._changed(properties, evt);
    })
    .on('item:removed', function(properties) {
      var evt = 'provider -> item:removed';
      _this.log.debug({ properties: properties }, evt);
      if (_this.provided[properties.relativePath]) {
        delete _this.provided[properties.relativePath];
      }
      else {
        console.warn('Provider path %s does not exist', properties.relativePath);
      }
    });
  require(path.join(process.cwd(), providerPath))({
    create: function(uid, data) {
      provider.create(uid, data);
    },
    update: function(uid, data) {
      provider.update(uid, data);
    },
    remove: function(uid) {
      provider.remove(uid);
    }
  });
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
  var _this = this;
  var result = [];
  this.forEach(function(relativePath, properties) {
    var props = properties.getProperty(propertyName);
    if (props.length) {
      _this.log.trace('\t-> props', props);
      for (var j=0; j < props.length; j++) {
        var prop = props[j];
        if (result.indexOf(prop) < 0) {
          result.push(prop);
          _this.log.trace('\t\t-> discovered prop %s', prop);
        }
      }
    }
  });
  return result;
};

Site.prototype.urls = function(dedupe, locale, generate) {
  var _this = this;
  var urls = [];
  this.forEach(function(relativePath, properties) {
    if (!properties.hasProperty('route') && generate) {
      var generatedUrl = Site.generateUrl(properties, locale);
      if (generatedUrl) {
        properties.append('route', generatedUrl, locale);
      }
      else {
        _this.log.warn({ properties: properties }, 'unable to auto generate route');
      }
    }
    var pageUrl = new Page(properties.getAsHash(locale)).url(null);
    if (!pageUrl) {
      _this.log.info({ properties: properties }, 'unreachable; no route found');
    }
    if (!dedupe || urls.indexOf(pageUrl) < 0) {
      urls.push(pageUrl);
    }
  });
  return urls;
};

Site.prototype.findByAny = function(propertyName) {
  var _this = this;
  var possibilities = this.aggregate(propertyName)
    , pages = {};
  _this.log.trace('findByAny %s', propertyName);
  for (var i=0; i < possibilities.length; i++) {
    var possibility = possibilities[i];
    _this.log.trace('\t-> possibility %s', possibility);
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

Site.prototype.getPageForUrl = function(url, searchMode) {
  var pages = [];
  if (searchMode === 'exact' || searchMode === 'auto') {
    pages = this.findByProperty('route', url);
  }
  if (searchMode === 'broad' || (!pages.length && searchMode === 'auto')) {
    this.forEach(function(relativePath, properties) {
      // console.log('\t-> does provider %s match?', properties.relativePath, properties.getProperty('route'));
      if (properties.getParamsForUrl(url)) {
        pages.push(properties);
      }
    });
  }
  return Site.filterPagesByRoute(pages || [], url);
};

Site.prototype.generateUrl = function(properties, locale) {
  var p = properties.relativePath
    , cwd = process.cwd()
    , url;
  if (0 === p.indexOf(cwd)) { // just in case a bug still exists where rel path is abs path
    p = p.substr(cwd.length);
  }
  if (p.indexOf(this.dataPath) > -1) {
    p = p.split(this.dataPath)[1];
  }
  url = p.split('.html' + path.sep + 'page.html')[0].replace(/\.[\w\d]+$/, '').trim().toLowerCase();
  if (url[0] !== path.sep) {
    url = path.sep + url;
  }
  if (url.length <= 1) { // either empty (shouldn't be) or "/"
    return null;
  }
};

Site.filterPagesByRoute = function(pages, url) {
  // console.log('Reducing matching routes...');
  var preferredPages = pages.filter(function(page) {
    // console.log('\t-> Page %s has property preferred? %s', page.relativePath, page.hasProperty('preferred'));
    return page && page.hasProperty('preferred');
  });
  if (pages.length > 1 && !preferredPages.length) {
    log.warn({ url: url, list: pages.map(function(element){ return element.relativePath; }) }, 'no preferred route in multiple matches');
    pages.forEach(function(page, index) {
      log.trace({ properties: page }, 'Index: ' + index);
    });
  }
  if (!preferredPages.length) preferredPages = pages;

  var nonproviderPages = preferredPages.filter(function(page) {
    // console.log('\t-> Page %s is not provider? %s', page.relativePath, 0 !== page.relativePath.indexOf('provider:'));
    return page && 0 !== page.relativePath.indexOf('provider:');
  });
  if (!nonproviderPages.length) nonproviderPages = preferredPages;

  // console.log('\t-> Matches: ', nonproviderPages.length);

  return nonproviderPages;
};

module.exports = Site;
