var fs = require('fs');
var bunyan = require('bunyan');
var logger = bunyan.createLogger({
  name: 'fancy',
  src: true,
  stream: fs.createWriteStream('./fancy-error.log', { flags: 'a' }),
  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
    err: bunyan.stdSerializers.err,

  }
});

module.exports = logger;
