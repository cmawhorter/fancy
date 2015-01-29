var fs = require('fs')
  , path = require('path');

var fingerprint = require('./fingerprint.js');

var cache = {
  cachePath: './.fancy/cache/',
  io: function(key, val, callback) {
    if (typeof val === 'function') {
      callback = val;
      val = void 0;
    }
    callback = callback || function(){};
    var hashKey = fingerprint.stringSync(key);
    var cachePath = path.join(process.cwd(), cache.cachePath, hashKey);
    // console.log('cache.cache(%s): %s', key, cachePath);
    if (void 0 !== val) {
      // console.log('\t-> writing %j', val);
      fs.writeFile(cachePath, JSON.stringify(val), callback);
    }
    else {
      // console.log('\t-> reading');
      fs.exists(cachePath, function(exists) {
        // console.log('\t\t-> exists? ', exists);
        if (!exists) {
          return callback(null);
        }
        fs.readFile(cachePath, function(err, data) {
          if (err) {
            return callback(err);
          }
          // console.log('\t\t\t-> file read Byte Length', data.byteLength);
          callback(null, JSON.parse(data));
        });
      });
    }
  }
};

module.exports = cache;
