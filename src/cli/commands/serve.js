var debug = require('debug')('http');

var help = require('../../utils/help');

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

  var workingDir = help.getWorkingDirectory(dir);
  // console.log('workingDir', workingDir, 'port', port, 'dir', dir); process.exit();

  var app = require('../server/app')(workingDir);

  console.log('Port set to: ' + port);
  app.set('port', port);

  var server = app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + server.address().port);
  });

};
