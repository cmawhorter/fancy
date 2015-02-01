
module.exports = {
  import: function(passed, defaults) {
    var options = Object.create(defaults);
    for (var k in passed) {
      if (k in options) {
        options[k] = passed[k];
      }
      else {
        return false;
      }
    }
    return options;
  }
};
