var debug = require('debug')('http');

var Fancy = require('../../fancy/index')
  , help = require('../../utils/help');

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
  process.chdir(cwd);
  // console.log('cwd', cwd, 'port', port, 'dir', dir); process.exit();

  var fancy = new Fancy({
    port: port
  });
  fancy.init(function(err) {
    if (err) throw err;
    // process.exit();
  });
};
