var create = require('./create')
  , serve = require('./serve')
  , clean = require('./clean')
  , build = require('./build')
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
  , make: compile
  , generate: compile

  , build: build
};

module.exports = cmds;
