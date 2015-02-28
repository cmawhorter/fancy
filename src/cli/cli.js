// FIXME: commands dep on each other but args aren't consistent and generally confusing.  probably remove yargs and just replace with config for almost all

var fs = require('fs')
  , path = require('path')
  , spawn = require('child_process').spawn;

var _ = require('lodash')
  yargs = require('yargs');

function commandUsage(name, description) {
  return '  ' + _.padRight(name, 12) + description;
}

var usage = [
    'usage: $0 [<options>] <command> [<args>]'
  , ''
  , 'List of commands:'
  , commandUsage('create', 'Lorem ipsum dolor sit amet, consectetur adipisicing elit')
  , commandUsage('info', 'Lorem ipsum dolor sit amet, consectetur adipisicing elit')
  , commandUsage('serve', 'Start web server and serve the specified site')
  , commandUsage('compile', 'Numquam debitis fugiat quisquam consequuntur beatae enim maxime')
  , commandUsage('package', 'Distinctio deleniti esse soluta minima repellendus')
  , commandUsage('deploy', 'Nisi id ad mollitia provident, animi nam')
].join('\n');

var argv = yargs.usage(usage)
  .help('help').alias('help', 'h')
  .version(require(path.join(__dirname, '../../package.json')).version + '\n', 'version').alias('version', 'V')
  .options({
    'verbose': {
      alias: 'v',
      description: 'Multiple allowed',
      count: 'verbose'
    }
  })
  .argv;

var cmds = {
    info: path.join(__dirname, '../../bin/fancy-info')
  , serve: path.join(__dirname, '../../bin/fancy-serve')
  , compile: path.join(__dirname, '../../bin/fancy-compile')
};

var cmd;
switch (argv._[0]) {
  case 'serve':
  case 'server':
  case 'start':
  case 'test':
    cmd = 'serve';
  break;

  case 'compile':
    cmd = 'compile';
  break;

  case 'info':
  case 'detail':
  case 'details':
    cmd = 'info';
  break;

  default:
    if (fs.existsSync('./.fancy')) {
      cmd = 'info';
    }
    else {
      console.error("%s: '%s' is not a valid command. See '%s --help'.", argv.$0, argv._[0], argv.$0);
      process.exit(1);
    }
  break;
}

var serve = spawn(cmds[cmd], process.argv.slice(2));

// if (argv.verbose > 0 || cmd == 'info') {
  serve.stdout.pipe(process.stdout);
  serve.stderr.pipe(process.stderr);
// }

serve.on('close', function(code) {
  process.exit(code);
});
