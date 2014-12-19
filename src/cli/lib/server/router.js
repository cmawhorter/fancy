var path = require('path');

var express = require('express');

// var db = require(path.join(process.cwd(), './.fancy/db/'));

var router = express.Router();
router.get('*', function(req, res) {
  res.render('primary', { title: 'Express' });
});

module.exports = router;
