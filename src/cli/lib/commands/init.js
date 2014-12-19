var exec = require('child_process').exec;

var async = require('async')
  , extfs = require('extfs');

var help = require('../help');

module.exports = function(yargs) {
  var argv = yargs.argv;
  console.log('init', argv);

  var workingDir = help.getWorkingDirectory(argv._[1]);

  if (!extfs.isEmptySync(workingDir)) {
    console.log('Target directory is not empty: %s', workingDir);
    process.exit(1);
  }

  var dirs = {
      dot:        help.createDirectory(workingDir, '.fancy')
    , db:         help.createDirectory(workingDir, '.fancy/db')
    , http:       help.createDirectory(workingDir, '.fancy/http')
    , content:    help.createDirectory(workingDir, 'www/data/content')
    , resources:  help.createDirectory(workingDir, 'www/data/resources')
    , assets:     help.createDirectory(workingDir, 'www/data/assets')
    , themes:     help.createDirectory(workingDir, 'www/themes')
    , handlers:   help.createDirectory(workingDir, 'www/handlers')
    , dist:       help.createDirectory(workingDir, 'dist')
  };

  // help.createFile(workingDir, 'package.json', help.packageJson);

  var asyncTasks = [];

  // express-generator
  asyncTasks.push(function(taskCallback) {
    var express = help.cmds.express();
    exec(express+' http', {
      cwd: dirs.dot
    }, function(err, stdout, stderr) {
      if (err) return taskCallback(err);
      exec('npm install', {
        cwd: dirs.http
      }, taskCallback);
    });
  });

  async.parallel(asyncTasks, function(err) {
    if (err) throw err;
    console.log('Done.');
  });

  // TODO: install deps

  // TODO: start server
}
