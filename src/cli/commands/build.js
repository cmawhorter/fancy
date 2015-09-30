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
  , Build = require('../../compile/build.js')
  , help = require('../../utils/help');

var site = require('../lib/site.js');

var debug = require('debug')('http');

module.exports = function(yargs) {
  var argv = yargs
    .options({
      'target': {
        alias: 't',
        default: 'node'
      }
    }).argv;

  var dir = '.';
  var cwd = help.getWorkingDirectory(dir);
  site.verify(cwd);

  process.chdir(cwd);
  // console.log('cwd', cwd, 'port', port, 'dir', dir); process.exit();

  Build.start('./.fancy/compiled', argv.target, function(err) {
    if (err) throw err;
    process.exit();
  });
};
