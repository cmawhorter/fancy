var path = require('path');

var Voyeur = require('voyeur');

var Properties = require('./properties.js')
  , parsers = require('../content-parsers/parsers.js');

var E = require('../utils/E.js')
  , tell = require('../utils/tell.js')
  , log = require('../utils/log.js');

function Site(dataPath) {
  this.dataPath = path.normalize(dataPath + '/');
  this.pages = {};
  this.voyeur = new Voyeur({
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
    'ready',
    'reload',

    'create',
    'current',
    'expired',
    'remove',

    // 'watcher:add',
    // 'watcher:change',
    // 'watcher:delete',
  ].forEach(function(evt) {
    _this.voyeur.on(evt, function(relativePath, itemData, acknowledge) {
      console.log('Event (%s): %s', evt, relativePath, itemData);
    });
  });

  _this.voyeur
    .start(path.join(_this.dataPath, '/**/*.@(' + parsers.available.join('|') + ')'), { ignored: '**/*.html/*/**' }, function(){})
    .on('reload', function() {
      // re-initialize saved data
      for (var relativePath in _this.voyeur.db) {
        _this.voyeur.db[relativePath].data.properties = Properties.create(relativePath, _this.voyeur.db[relativePath].data.properties);
      }
    })
    .on('create', function(relativePath, itemData) {
      // parse newly discovered file
      parsers.process(relativePath, null, function(err, properties) {
        if (err) {
          log.error(err);
          return;
        }
        console.log('\t-> %s = %j', relativePath, properties.getProperty('route'));
        itemData.properties =
        _this.pages[relativePath] = properties;
      });
    })
    .on('expired', function(relativePath, itemData, acknowledge) {
      // update changed file
      parsers.process(relativePath, null, function(err, properties) {
        if (err) {
          log.error(err);
          return;
        }
        console.log('\t-> %s = %j', relativePath, properties.getProperty('route'));
        itemData.properties =
        _this.pages[relativePath] = properties;
        acknowledge();
      });
    })
    .on('ready', function() {
      var page = _this.getPageForUrl('/');
      console.log('Finding / page: ', page ? page.relativePath : 'not found');
    });

  return _this;
};

Site.prototype.findByProperty = function(propertyName, propertyValue) {
  var pages = [];
  for (var relativePath in this.pages) {
    var properties = this.pages[relativePath];
    if (properties.hasMatchingProperty(propertyName, propertyValue)) {
      pages.push(properties);
    }
  }
  return pages;
};

Site.prototype.getPageForUrl = function(url) {
  var pages = this.findByProperty('route', url);
  // console.log('getPageForUrl', url, pages);

  if (!pages.length) { // no direct match found.  urlPattern matching
    // console.log('\t-> No exact matching routes');
    for (var relativePath in this.pages) {
      var page = this.pages[relativePath];
      // console.log('\t-> does page %s match?', page.relativePath);
      if (page.getParamsForUrl(url)) {
        pages.push(page);
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
