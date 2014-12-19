var yargs = require('yargs');

var commands = require('./commands/index');

var cmdName = process.argv[2]
  , cmd = commands[cmdName];

if (cmd) {
  cmd(yargs);
}
else {
  console.log('Command not found: %s', cmdName);
  process.exit(-1);
}
