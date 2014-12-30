var debug = require('debug')('http');

var fancy = require('../../fancy/index')
  , help = require('../../utils/help');

module.exports = function(yargs) {
  var argv = yargs.argv;
  console.log('serve', argv);

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
  // console.log('cwd', cwd, 'port', port, 'dir', dir); process.exit();

  fancy(function(err) {
    if (err) throw err;
    this.start(function(err, server) {
      if (err) throw err;
      console.log('Express server listening on port ' + server.address().port);
    });
  });
};
