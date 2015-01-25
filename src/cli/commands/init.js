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
    , content:    help.createDirectory(workingDir, 'data/content')
    , providers:  help.createDirectory(workingDir, 'data/providers')
    , settings:   help.createDirectory(workingDir, 'data/settings')
    , assets:     help.createDirectory(workingDir, 'data/assets')
    , themes:     help.createDirectory(workingDir, 'themes')
    , plugins:    help.createDirectory(workingDir, 'extensions')
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
