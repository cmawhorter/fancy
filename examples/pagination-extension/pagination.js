module.exports = function(collection, options, callback) {
  console.log('Pagination plugin');
  var pageStart = parseInt(options.pageStart, 10) || 0;
  var pageLimit = parseInt(options.pageLimit, 10) || 10;

  var start = pageStart * pageLimit;
  var stop = start + pageLimit;

  // console.log('collection len', collection.length, 'pageStart', pageStart, 'pageLimit', pageLimit);

  var getColKey = 'length' in collection ? function(index) { return index; } : function(index) { return Object.keys(collection)[index]; };
  var colLen = 'length' in collection ? collection.length : Object.keys(collection).length;

  var totalPages = Math.ceil(colLen / pageLimit);

  for (var i=start; i < colLen && i < stop; i++) {
    var item = collection[getColKey(i)];
    // console.log('iterating', item);
    callback(item);
  }

  var previous = pageStart - 1
    , next = pageStart + 1;

  if (next >= totalPages) {
    next = null;
  }

  if (previous < 1) {
    previous = null;
  }

  return {
      current: pageStart
    , previous: previous
    , next: next
    , totalPages: totalPages
    , multiPages: totalPages > 1
  };
};
