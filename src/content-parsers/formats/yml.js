var yaml = require('js-yaml');

module.exports = function(contents, callback) {
  var obj = yaml.load(contents.toString('utf8'));
  callback(null, typeof obj === 'object' ? obj : {});
};
