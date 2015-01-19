var fs = require('fs')
  , path = require('path')
  , url = require('url');

var ncp = require('ncp').ncp
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf');

var Fancy = require('../../fancy/index.js')
  , Build = require('../../build/index.js')
  , help = require('../../utils/help');

var debug = require('debug')('http');

module.exports = function(yargs) {
  var argv = yargs.argv;
  console.log('build', argv);

  var port = 3000
    , dir = '.';
  switch (argv._.length) {
    case 2:
      var arg1 = parseInt(argv._[1], 10);
      if (isNaN(arg1)) {
        dir = argv._[1];
      }
      else {
        port = arg1;
      }
    break;

    case 3:
      port = argv._[1];
      dir = argv._[2];
    break;
  }

  var cwd = help.getWorkingDirectory(dir);
  process.chdir(cwd);
  // console.log('cwd', cwd, 'port', port, 'dir', dir); process.exit();

  var endpoint = 'http://localhost:' + port;

  var build = new Build();

  var _alreadyCrawled = [];
  function queue(href) {
    var parsedUrl = url.parse(href)
      , isRelative = parsedUrl.protocol === null && parsedUrl.host === null
      , matchesDomain = parsedUrl.protocol == 'http:' && parsedUrl.hostname == 'localhost' && parsedUrl.port == port;

    // console.log('queue', parsedUrl, isRelative, matchesDomain);

    if ('#' === parsedUrl.href[0]) {
      console.log('Invalid url: %s', href);
    }
    else if (_alreadyCrawled.indexOf(parsedUrl.pathname) > -1) {
      console.log('Url already crawled: %s', href);
    }
    else if (isRelative || matchesDomain) {
      if (isRelative) {
        href = url.resolve(endpoint, href);
      }
      console.log('QUEUE %s', href);
      _alreadyCrawled.push(parsedUrl.pathname);
      // crawler.queue(href);
    }
    else {
      console.log('Ignored "%s".  Does not match endpoint %s', href, endpoint);
    }
  }

  var fancy = new Fancy({
    port: port
  });
  fancy.init(function(err) {
    if (err) throw err;
    console.log('Express server listening on port ' + fancy.server.address().port);

    (fancy.options.config.build.routes || []).forEach(function(route) {
      if (route) {
        queue(route);
      }
    });

    Object.keys(fancy.db.relationships.route).forEach(function(route) {
      // FIXME: limit to regular routes only.  exclude url patterns /path/:id/:blah
      if (route) {
        queue(route);
      }
    });

    rimraf('./dist', function() {
      mkdirp.sync('./dist');
      // ncp('./themes/blah/public/', './dist', function (err) {
      //  if (err) {
      //    return console.error(err);
      //  }
      //  console.log('done!');
      // });
      process.exit(0);
    });
  });
};
