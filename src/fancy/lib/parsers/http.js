var parsley = require('parsley');
var Page = require('../page');


module.exports = function(stream, callback) {
  parsley(stream, function (req) {
    var head = [];
    req.on('rawHead', function (buf) {
      head.push(buf);
    });

    var body = [];
    req.on('rawBody', function (buf) {
      body.push(buf);
    });

    req.on('error', function(err) {
      callback(err);
    });

    req.on('end', function () {
      console.dir(head.map(String));
      console.dir(body.map(String));
      callback(null, new Page(head, body);
    });
  });
};
