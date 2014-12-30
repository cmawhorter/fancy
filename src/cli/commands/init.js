var exec = require('child_process').exec;

var async = require('async')
  , extfs = require('extfs');

var help = require('../../utils/help');

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
    , content:    help.createDirectory(workingDir, 'data/content')
    , resources:  help.createDirectory(workingDir, 'data/resources')
    // , assets:     help.createDirectory(workingDir, 'data/assets') // these belong to data/content, no?
    , themes:     help.createDirectory(workingDir, 'themes')
    , handlers:   help.createDirectory(workingDir, 'handlers')
    , plugins:    help.createDirectory(workingDir, 'plugins')
    , dist:       help.createDirectory(workingDir, 'dist')
  };

  var pkg = require('../../templates/package.json');
  help.createFile(workingDir, 'package.json', JSON.stringify(pkg, null, '  '));

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

};
