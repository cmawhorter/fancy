var fs = require('fs')
  , crypto = require('crypto');

// http://stackoverflow.com/a/18658613/670023
function fingerFile(f, algo, callback) {
  if (typeof algo === 'function') {
    callback = algo;
    algo = 'md5';
  }

  var fd = fs.createReadStream(f)
    , hash = crypto.createHash(algo || 'md5');

  hash.setEncoding('hex');

  fd.on('error', function(err) {
    callback(err);
  });

  fd.on('end', function(err) {
    hash.end();
    callback(null, hash.read());
  });

  fd.pipe(hash);
}

function fingerString(str, algo) {
  var hash = crypto.createHash(algo || 'md5');
  return hash.update(str || '').digest('hex');
}

function fingerObject(obj, algo) {
  var hash = crypto.createHash(algo || 'md5')
    , keys = Object.keys(obj || {});
  keys.sort();
  for (var i=0; i < keys.length; i++) {
    var key = keys[i];
    hash.update(key);
    hash.update(obj[key].toString());
  }
  return hash.digest('hex');
}

function fingerArray(arr, algo, deep) {
  var hash = crypto.createHash(algo || 'md5');
  if (deep) {
    for (var i=0; i < (arr.length || 0); i++) {
      var obj = keys[i];
      hash.update(fingerObject(obj, algo));
    }
  }
  else {
    hash.update((arr || []).length.toString());
  }
  return hash.digest('hex');
}

module.exports = {
    file: fingerFile
  , stringSync: fingerString
  , objectSync: fingerObject
  , arraySync: fingerArray
  , sync: function(obj, algo) {
      switch (toString.call(obj)) {
        case '[object Object]':
          return fingerObject(obj, algo);
        case '[object Array]':
          return fingerArray(obj, algo);
        default:
          return fingerString(obj, algo);
      }
    }
};
