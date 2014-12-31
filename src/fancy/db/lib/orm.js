var Sequelize = require('sequelize');

module.exports = function(target) {
  var sequelize = new Sequelize(null, null, null, {
    dialect: 'sqlite',
    storage: target
  });

  var models = {};
  var Page = models.Page = sequelize.define('page', {
    id: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    fingerprint: {
      type: Sequelize.STRING,
      validate: {
        notEmpty: true
      }
    }
  }, {
    indexes: [
      {
        name: 'name_index',
        method: 'BTREE',
        fields: ['name']
      }
    ]
  });

  return { sequelize: sequelize, models: models };
};
