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
    if (!fs.existsSync(targ)) {
      mkdirp.sync(workingDir);
    }

    // if (this.isDirectory(workingDir)) {
      return workingDir;
    // }
    // else { // FIXME: throws error for symlink
    //   throw new Error('Invalid working directory: ' + targ);
    // }
  },

  isDirectory: function(targ) {
    return fs.lstatSync(targ).isDirectory();
  },

  createFile: function(dir, targ, contents) {
    fs.writeFileSync(path.join(dir, targ), contents || '');
  },

  notifier: function(message, interval) {
    console.log('%s...', message);
    var percent = 0;
    var gc = [];
    gc.push(setInterval(function() {
      if (percent) {
        console.log('Still %s... %d\% complete', message, percent);
      }
      else {
        console.log('Still %s...', message);
      }
    }, interval || 2000));
    return {
      add: function(fn, interval) {
        gc.push(setInterval(fn, interval));
      },
      update: function(p) {
        percent = Math.floor(p * 100);
      },
      done: function() {
        gc.map(clearInterval);
        console.log('Done %s.', message);
      }
    };
  }

}
