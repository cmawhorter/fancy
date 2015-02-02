module.exports = function(contents, callback) {
  callback(null, { body: contents.toString('utf8') });
};
