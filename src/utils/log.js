var bunyan = require('bunyan');
var logger = bunyan.createLogger({
  name: 'fancy',
  src: true,
  stream: './fancy-error.log',
  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
    err: bunyan.stdSerializers.err,

  }
});

module.exports = logger;
