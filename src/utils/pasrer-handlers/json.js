module.exports = function(contents, callback) {
  var obj = JSON.parse(contents);
  callback(null, typeof obj === 'object' ? obj : {});
};
