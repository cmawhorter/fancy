var debug = require('debug')('http');

module.exports = function(yargs) {
  var argv = yargs.argv;
  console.log('serve', argv);

  var app = require('../server/app');

  app.set('port', argv._[1] || 3000);

  var server = app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + server.address().port);
  });

};
