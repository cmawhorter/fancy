var Page = require('./page.js');

function Resources(request, pages, activePage) {
  var _this = this;
  var _request = request
    , _pages = pages
    , _cursor;

  for (var i=0; i < pages.length; i++) {
    var resource = pages[i];
    _pages.push(resource instanceof Page ? resource : new Page(_request, resource));
  }

  Object.defineProperty(this, 'activeIndex', {
    get: function() {
      return _pages.indexOf(activePage);
    }
  });

  _cursor = this.activeIndex;
  Object.defineProperty(this, 'cursor', {
    get: function() {
      return _cursor;
    }
  });

  Object.defineProperty(this, 'next', {
    value: function() {
      return _this.go(_cursor + 1);
    }
  });

  Object.defineProperty(this, 'previous', {
    value: function() {
      return _this.go(_cursor - 1);
    }
  });

  Object.defineProperty(this, 'reset', {
    value: function() {
      return _this.go(0);
    }
  });

  Object.defineProperty(this, 'go', {
    value: function(index) {
      _cursor = Math.min(Math.max(0, index), _pages.length - 1);
      return _this;
    }
  });

  Object.defineProperty(this, 'page', {
    get: function() {
      return _pages[_cursor];
    }
  });
}

module.exports = Resources;
