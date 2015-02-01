var fs = require('fs')
  , path = require('path')
  , url = require('url')
  , crypto = require('crypto')
  , cluster = require('cluster');

var async = require('async')
  , mkdirp = require('mkdirp')
  , cheerio = require('cheerio')
  , glob = require('glob')
  , request = require('request');

// request.debug = true;

var Fancy = require('../fancy/index.js');
var helpers = require('../fancy/helpers/index.js');
var workers = require('./workers.js');

function Compile(options, done) {
  options.concurrency = Math.max(0, (options.concurrency || 0) - 1); // workaround to hackish way cluster is added
  this.isMaster = !options.concurrency || cluster.isMaster;
  console.log('Fancy Options: ', options);
  this.fancy = new Fancy(options);
  this.done = done || function(){
    console.log('Done!');
    process.exit();
  };

  this.host = 'localhost';
  this.destination = 'dist';

  this.queue = null;
  this.workers = 1;
  this.knownRoutes = [];

  this.index = {};

  if (this.isMaster) { // monitor master fancy routes
    var _this = this;
    var _routeDiscovered = this.fancy.routeDiscovered;
    this.fancy.routeDiscovered = function(url) {
      var ret = _routeDiscovered.apply(this, arguments);
      if (ret) {
        _this.enqueueUrl(url);
      }
      return ret;
    }
  }
}

Compile.prototype.start = function(callback) {
  var _this = this;

  mkdirp.sync(_this.destination);
  workers.endpoint = this.host + ':' + this.fancy.options.port;

  if (_this.isMaster) {
    _this.queue = async.queue(function(route, taskCallback) {
      _this.addResource(route, request('http://localhost:3000' + route), taskCallback);
    }, _this.workers);
    _this.queue.drain = function() {
      fs.writeFileSync(path.join(_this.destination, 'index.json'), JSON.stringify(_this.index, null, 2));
      _this.done.apply(this, arguments);
    };
  }

  _this.fancy.init(function(err) {
    if (err) return callback(err);
    _this.onReady();
    callback(null);
  });

  // async.parallel([
      // TODO: support multiple content directories
  // var matches = glob('./data/content/**/*.html/public');
  // for (var i=0; i < matches.length; i++) {
  //   app.use(express.static(path.join(process.cwd(), matches[i])));
  // }

  // ], function() {

  // });
};

Compile.prototype.onReady = function() {
  var _this = this;
  console.log('Compile ready %s', process.pid);
  (_this.fancy.options.buildRoutes || []).forEach(_this.enqueueUrl);

  for (var relativePath in _this.fancy.db.pages) {
    var page = _this.fancy.db.pages[relativePath];
    var utils = helpers({}, _this.fancy);
    _this.enqueueUrl(utils.relative(null, page.toTemplateObject()));
  }


  // rimraf('./dist', function() {
  //   mkdirp.sync('./dist');
  //   // ncp('./themes/blah/public/', './dist', function (err) {
  //   //  if (err) {
  //   //    return console.error(err);
  //   //  }
  //   //  console.log('done!');
  //   // });
  //   process.exit(0);
  // });
};

Compile.prototype.enqueueUrl = function(route) {
  var _this = this;
  if (_this.isMaster && _this.knownRoutes.indexOf(route) < 0) {
    console.log('<- Discovered: %s', route);
    _this.queue.push(route);
    // request('http://localhost:3000' + task.route).pipe(writable);
  }
};

Compile.prototype.addResource = function(route, contents, callback) {
  var hash = crypto.createHash('sha1').update(route).digest('hex');
  this.index[hash] = route;
  var writable = fs.createWriteStream(path.join(this.destination, hash));
  contents.pipe(writable);
  contents.on('end', callback);
};

// Compile.prototype.getWritable = function(route) {
//   var f = (route || '').toLowerCase().trim().replace(/[^\w\d]+/g, '-').replace(/\-\-+/g, '-').replace(/^\-+|\-+$/, '') + '.html';
//   return fs.createWriteStream(path.join(this.destination, f));
// };

module.exports = Compile;
