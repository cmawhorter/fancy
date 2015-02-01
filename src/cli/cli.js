var path = require('path')
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
  .demand(1)
  .argv;

var cmds = {
  serve: path.join(__dirname, '../../bin/fancy-serve')
};

var cmd;
switch (argv._[0]) {
  case 'serve':
  case 'server':
  case 'start':
  case 'test':
    cmd = 'serve';
  break;

  default:
    console.error("%s: '%s' is not a valid command. See '%s --help'.", argv.$0, argv._[0], argv.$0);
    process.exit(1);
  break;
}

var serve = spawn(cmds[cmd], process.argv.slice(2));

if (argv.v > 0) {
  serve.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  serve.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });
}

serve.on('close', function(code) {
  process.exit(code);
});
