var inquirer = require('inquirer')
  , extfs = require('extfs');

var help = require('../../utils/help.js');
var site = require('../lib/site.js');

module.exports = function(yargs) {
  var argv = yargs.argv;
  var workingDir = help.getWorkingDirectory(argv._[1]);

  var questions = [
    {
      type: 'expand',
      name: 'overwrite',
      message: 'Directory is not empty: ' + workingDir,
      choices: [
        {
          key: "O",
          name: "Overwrite",
          value: "overwrite"
        },
        {
          key: "c",
          name: "Cancel",
          value: "cancel"
        },
      ],
      when: function(answers) {
        return !extfs.isEmptySync(workingDir);
      },
      validate: function(value) {
        if (value == 'cancel') {
          process.exit(1);
        }
      }
    },
  ];

  inquirer.prompt(questions, function(answers) {
    if (!answers.overwrite || answers.overwrite == 'overwrite') {
      var dirs = site.createDirectories(workingDir);
      site.copyTemplate(dirs, function() {
        console.log('Run: npm install && fancy serve');
        process.exit();
      });
    }
  });
};
