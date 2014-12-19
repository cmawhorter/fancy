var fs = require('fs')
  , path = require('path');

var mkdirp = require('mkdirp');

module.exports = {
  createDirectory: function(dest, optTarg) {
    var targ = dest;
    if (optTarg) targ = path.join(targ, optTarg);
    mkdirp.sync(targ);
    return targ;
  },

  getWorkingDirectory: function(targ) {
    targ = targ || '.';
    var workingDir = '.' === targ ? process.cwd() : targ;
    if (this.isDirectory(workingDir)) {
      return workingDir;
    }
    else {
      throw new Error('Invalid working directory');
    }
  },

  isDirectory: function(targ) {
    return fs.existsSync(targ) && fs.lstatSync(targ);
  },

  createFile: function(dir, targ, contents) {
    fs.writeFileSync(path.join(dir, targ), contents || '');
  },

  cmds: {
    express: function() {
      return path.join(__dirname, '../node_modules/.bin/express');
    }
  }
}
