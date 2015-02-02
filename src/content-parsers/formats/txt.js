module.exports = function(contents, properties, defaultLocale, relativePath) {
  // text can't contain properties, so just pass it back to the caller
  return contents.toString('utf8');
};
