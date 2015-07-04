var Page = require('./page.js');

// FIXME: inherits array, but doesn't wrap -- which could lead to all sorts of problems bc of direct data access
// TODO: sorting

function Collection(pages, activePage) {
  var _this = this;
  pages = pages || [];
  var _cursor;

  for (var i=0; i < pages.length; i++) {
    _this.push(pages[i]);
  }

  Object.defineProperty(this, 'activeIndex', {
    get: function() {
      return _this.indexOf(activePage);
    }
  });
}

Collection.prototype = Object.create(Array.prototype);

Collection.prototype._push = Collection.prototype.push;
Collection.prototype.push = function() {
  for (var i=0; i < arguments.length; i++) {
    var arg = arguments[i];
    this._push(arg instanceof Page ? arg : new Page(arg));
  }
};

// return every entry after the active page
Collection.prototype.afterEach = function(fn) {
  var _this = this;
  _this.filter(function(element, index) { return index > _this.activeIndex }).forEach(fn);
};

Collection.prototype.next = function() {
  return this[this.activeIndex + 1];
};

Collection.prototype.previous = function() {
  return this[this.activeIndex - 1];
};

module.exports = Collection;
