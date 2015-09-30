var fs = require('fs');
var bunyan = require('bunyan');
var PrettyStream = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

var argv = require('yargs')
  .options({
    'verbose': {
      alias: 'v',
      count: 'verbose'
    }
  }).argv;

var streams = [
  {
      level: 'warn'
    , type: 'raw'
    , stream: prettyStdOut
  },
  {
      level: 'error'
    , path: './fancy-error.log'
  }
];

var logger = bunyan.createLogger({
  name: 'fancy',
  // src: true,
  streams: streams,
  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
    err: bunyan.stdSerializers.err,
    site: function site(site) {
      if (!site) return site;
      return site.dataPath;
    },
    properties: function properties(properties) {
      if (!properties) return properties;
      return {
        path: properties.relativePath,
        id: properties.getProperty('id'),
        route: properties.getProperty('route')
      };
    },
    diskItem: function item(item) {
      if (!item) return item;
      return {
        path: item.path,
        revision: item.revision,
        expired: item.expired
      };
    },
    list: function list(list) {
      if (!list || !Array.isArray(list)) return list;
      return list.length + ' item(s)\n\t' + list.join('\n\t');
    }
  }
});

if (argv.verbose) {
  logger.levels(0, 40 - (argv.verbose*10));
  console.log('Log Level: ' + logger.levels(0));
}


module.exports = logger;