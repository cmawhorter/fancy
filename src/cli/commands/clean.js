var path = require('path');

var rimraf = require('rimraf');

var help = require('../../utils/help');

var subcmds = [ 'cache', 'db', 'all' ];

module.exports = function(yargs) {
  var argv = yargs.argv;

  if (argv._.length < 1 || subcmds.indexOf((argv._[1] || '').toLowerCase()) < 0) {
    console.error('Expects target: fancy clean [target] -- where target is one of these: ' + subcmds.join(', '));
    process.exit(-1);
  }

  var subcmd = argv._[1].toLowerCase()
    , dir = argv._[2] || '.';

  var cwd = help.getWorkingDirectory(dir)
    , target;
  switch (subcmd) {
    case 'cache':
      target = '.fancy/cache';
    break;

    case 'db':
      target = '.fancy/db';
    break;

    case 'all':
      target = '.fancy';
    break;

    default:
      throw new Error('This cannot happen.');
  }
  rimraf(path.join(cwd, target), function(err) {
    if (err) throw err;
    process.exit(0);
  });
};
