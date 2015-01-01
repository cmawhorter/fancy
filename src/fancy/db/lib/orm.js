var Sequelize = require('sequelize');

var sequelize = new Sequelize(null, null, null, {
  dialect: 'sqlite',
  storage: ':memory:' // TODO: path.join(cwd, './.fancy/db/pages.sqlite3')
});

var models = {};
var Page = models.Page = sequelize.define('page', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  path: {
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
  },
}, {
  indexes: [
    {
      name: 'fingerprint_index',
      method: 'BTREE',
      fields: ['fingerprint']
    },
    {
      name: 'path_index',
      unique: true,
      method: 'BTREE',
      fields: ['path']
    }
  ]
});

var Property = models.Property = sequelize.define('property', {
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
  content: {
    type: Sequelize.STRING
  },
}, {
  indexes: [
    {
      name: 'name_index',
      method: 'BTREE',
      fields: ['name']
    }
  ]
});

var Resource = models.Resource = sequelize.define('resource', {
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
}, {
  indexes: [
    {
      name: 'name_index',
      method: 'BTREE',
      unique: true,
      fields: ['name']
    }
  ]
});

Property.hasOne(Page);
Page.hasOne(Resource);
Resource.belongsToMany(Page);

module.exports = {
    sequelize: sequelize
  , models: models
};
