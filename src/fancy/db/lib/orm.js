var Sequelize = require('sequelize');

module.exports = function(target) {
  var sequelize = new Sequelize(null, null, null, {
    dialect: 'sqlite',
    storage: target
  });

  var models = {};
  var Page = models.Page = sequelize.define('page', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      validate: {
        notEmpty: true
      }
    },
    fingerprint: {
      type: Sequelize.STRING,
      validate: {
        notEmpty: true
      }
    }
  });

  return { sequelize: sequelize, models: models };
};
