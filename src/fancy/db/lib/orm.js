var fs = require('fs');

var Sequelize = require('sequelize');

// fs.unlinkSync('/Users/blah/tmp/fancy.sqlite3');

var sequelize = new Sequelize(null, null, null, {
  logging: false,
  dialect: 'sqlite',
  storage: /*'/Users/blah/tmp/fancy.sqlite3' //*/ ':memory:' // TODO: path.join(cwd, './.fancy/db/pages.sqlite3')
});

var models = {};
var Page = models.Page = sequelize.define('page', {
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
      name: 'propertyname_index',
      method: 'BTREE',
      fields: ['name']
    }
  ]
});

// FIXME: problem assigning a resource to multiple pages
// var Resource = models.Resource = sequelize.define('resource', {
//   name: {
//     type: Sequelize.STRING,
//     validate: {
//       notEmpty: true
//     }
//   },
// }, {
//   indexes: [
//     {
//       name: 'resourcename_index',
//       method: 'BTREE',
//       unique: true,
//       fields: ['name']
//     }
//   ]
// });

Property.belongsTo(Page);
Page.hasMany(Property);
// Page.belongsTo(Resource);


// Property.belongsTo(Page);
// Resource.belongsToMany(Page);
// Page.hasMany(Property);
// Page.belongsTo(Resource);

module.exports = {
    sequelize: sequelize
  , models: models
};
