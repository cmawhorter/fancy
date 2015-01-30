var create = require('./create')
  , serve = require('./serve')
  , clean = require('./clean')
  , compile = require('./compile');

var cmds = {
    create: create
  , 'new': create

  , clean: clean

  , serve: serve
  , server: serve
  , start: serve
  , test: serve

  , compile: compile
  , build: compile
  , make: compile
  , generate: compile
};

module.exports = cmds;
