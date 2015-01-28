var path = require('path');

var ncp = require('ncp').ncp;
ncp.clobber = true;

var help = require('../../utils/help.js');

module.exports = {
  createDirectories: function(workingDir) {
    var dirs = {
        cwd:        workingDir
      , db:         help.createDirectory(workingDir, '.fancy/db')
      , providercache: help.createDirectory(workingDir, '.fancy/providercache')
      , content:    help.createDirectory(workingDir, 'data/content')
      , providers:  help.createDirectory(workingDir, 'data/providers')
      , constants:  help.createDirectory(workingDir, 'data/constants')
      , assets:     help.createDirectory(workingDir, 'data/assets')
      , themes:     help.createDirectory(workingDir, 'themes/itworked')
      , extensions: help.createDirectory(workingDir, 'extensions')
    };
    return dirs;
  },

  copyTemplate: function(dirs, callback) {
    var templatePath = path.join(__dirname, '../templates');
    ncp(path.join(templatePath, 'data/constants/'), dirs.constants, function (err) {
      if (err) return console.log(err);
      ncp(path.join(templatePath, 'data/content/'), dirs.content, function (err) {
        if (err) return console.log(err);
        ncp(path.join(templatePath, 'theme/'), dirs.themes, function (err) {
          if (err) return console.log(err);
          ncp(path.join(templatePath, 'config.yml'), path.join(dirs.cwd, 'config.yml'), function (err) {
            if (err) return console.log(err);
            ncp(path.join(templatePath, 'package.json'), path.join(dirs.cwd, 'package.json'), function (err) {
              if (err) return console.log(err);
              callback();
            });
          });
        });
      });
    });
  },
};
