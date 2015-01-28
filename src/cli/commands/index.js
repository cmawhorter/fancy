var create = require('./create')
  , serve = require('./serve')
  , build = require('./build');

var cmds = {
    create: create
  , 'new': create

  , serve: serve
  , server: serve
  , start: serve
  , test: serve

  , build: build
};

module.exports = cmds;
