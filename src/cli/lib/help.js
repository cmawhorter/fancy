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
    var workingDir = path.resolve('.' === targ ? process.cwd() : targ);
    console.log('workingDir', workingDir);
    if (!fs.existsSync(targ)) {
      mkdirp.sync(workingDir);
    }

    if (this.isDirectory(workingDir)) {
      return workingDir;
    }
    else {
      throw new Error('Invalid working directory: ' + targ);
    }
  },

  isDirectory: function(targ) {
    return fs.lstatSync(targ).isDirectory();
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
