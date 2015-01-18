var express = require('express');

module.exports = function(fancy) {
  var router = express.Router();
  router.get('*', function(req, res, next) {
    console.log('Looking up page for %s...', req.url);
    fancy.requestPage(req.url, function(err, details) {
      if (err) {
        // TODO: implement better error handling
        // var err = new Error('Not Found');
        // err.status = 404;
        // return next(err);
        throw err;
      }
      res.render('layouts/' + details.page.properties.layouts[0], details.res);
    });
  });
  return router;
};
