var fs = require('fs')
  , path = require('path')
  , url = require('url');

var ncp = require('ncp').ncp
  , async = require('async')
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , portfinder = require('portfinder');

portfinder.basePort = 3000;

var Compile = require('../../compile/index.js')
  , help = require('../../utils/help');

var site = require('../lib/site.js');

var debug = require('debug')('http');

module.exports = function(yargs) {
  var argv = yargs.argv;

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
  site.verify(cwd);

  process.chdir(cwd);
  // console.log('cwd', cwd, 'port', port, 'dir', dir); process.exit();

  var compile = new Compile({
    port: port,
    concurrency: 0
  });
  rimraf(compile.destination, function() {
    compile.start(function(err) {
      if (err) throw err;
      // anything?
    });
  });
};
