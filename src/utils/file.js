var fs = require('fs')
  , crypto = require('crypto');

// http://stackoverflow.com/a/18658613/670023
function fingerprint(f, algo, callback) {
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

module.exports = {
  fingerprint: fingerprint
};
