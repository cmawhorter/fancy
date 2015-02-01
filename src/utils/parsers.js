var fs = require('fs')
  , path = require('path');

var file = require('./file.js')
  , CB = require('./CB.js');

var availableFormats = {
  html: require('./parser-handlers/html.js'),
  md:   require('./parser-handlers/md.js'),
  txt:  require('./parser-handlers/txt.js'),
  json: require('./parser-handlers/json.js'),
  js:   require('./parser-handlers/js.js'),
  yml:  require('./parser-handlers/yml.js'),
  directory: require('./parser-handlers/directory.js') // content directories
};

function parse(relativePath, callback) {
  var format = file.extension(relativePath);

  fs.readFile(relativePath, function(err, contents) {
    if (err) {
      return callback(err);
    }
    formats[format](contents, callback);
  });
}

parse.available = Object.keys(formats);

module.exports = parse;
