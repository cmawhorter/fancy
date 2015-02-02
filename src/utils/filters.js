var path = require('path');

var filters = {
  invalid: function(element) {
    return filters.null(element) && filters.undefined(element);
  },

  null: function(element) {
    return null !== element;
  },

  undefined: function(element) {
    return void 0 !== element;
  },

  dotfiles: function(element) {
    return element && path.basename(element)[0] !== '.';
  }
};

module.exports = filters;
