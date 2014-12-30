var cheerio = require('cheerio');

var arrayKeys = [ 'keywords' ];

module.exports = function(data, contents) {
  $ = cheerio.load(contents);

  var props = {}
    , output = [];

  function addProp(name, val) {
    if (name) {
      if (!data.relationships[name]) data.relationships[name] = {};
      if (!data.relationships[name][val]) data.relationships[name][val] = [];
      data.relationships[name][val].push(props);

      if (props[name]) {
        if ('object' !== typeof props[name] || !('length' in props[name])) {
          props[name] = [ props[name] ];
        }
        props[name].push(val);
      }
      else {
        props[name] = val;
      }
    }
  }

  $('meta').each(function() {
    var $el = $(this)
      , name = $el.attr('name')
      , val = $el.attr('content') || '';

    if (~arrayKeys.indexOf(name)) {
      val = val.split(/\s*,\s*/g);
      val.forEach(function(v) {
        addProp(name, v);
      });
    }
    else {
      addProp(name, val);
    }
  });

  props.title = $('title').text() || '';
  props.contentType = 'text/html; charset=utf-8';
  $('meta[http-equiv][content]').each(function() {
    var $this = $(this);
    if ($this.attr('http-equiv').toLowerCase() === 'content-type') {
      props.contentType = $this.attr('content');
    }
  });

  // $('link[rel="alternate"]').each(function() {
  //   var $el = $(this);
  //   output.push({
  //       type: ($el.attr('type') || '').toLowerCase()
  //     , title: ($el.attr('title') || '').toLowerCase()
  //     , href: ($el.attr('href') || '').toLowerCase()
  //   });
  // });

  props.body = $('body').html();

  data.pages[props.route] = props;

  var resource = $('meta[name="resource"]').attr('content');
  if (resource) {
    if (!data.resources[resource]) data.resources[resource] = {};
    data.resources[resource][props.route] = props;
  }
};
