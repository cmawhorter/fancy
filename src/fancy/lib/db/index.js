// var sqlite3 = require('sqlite3').verbose();

// // pages

// // db.serialize(function() {
// //   db.run("CREATE TABLE lorem (info TEXT)");

// //   var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
// //   for (var i = 0; i < 10; i++) {
// //       stmt.run("Ipsum " + i);
// //   }
// //   stmt.finalize();

// //   db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
// //       console.log(row.id + ": " + row.info);
// //   });
// // });

// // db.close();

// module.exports = function(src) {
//   src = src || ':memory:';
//   var db = new sqlite3.Database(src);
//   return db;
// };

// if content/.git and content/.git head hash != .cache/head.hash then selectively rebuild cache
// otherwise, just return the db
