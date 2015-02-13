function Page(data) {
  var _this = this;
  for (var k in data) {
    // allow properties to automatically toString to arr[0] if only one value exists
    (function(property) {
      Object.defineProperty(property, 'toString', {
        value: function() {
          if (property.length === 1) {
            return property[0] && property[0].toString ? property[0].toString() : '' + property[0];
          }
          else {
            return Array.prototype.toString.call(property);
          }
        }
      });

      Object.defineProperty(_this, k, {
          value: property
        , enumerable: true
      });
    })(data[k]);
  }
}

Page.prototype.value = function(key, defaultValue) {
  return this[key.trim().toLowerCase()] || defaultValue;
};

Page.prototype.first = function(key, defaultValue) {
  var val = this.value(key);
  return val && val.length ? val[0] : defaultValue;
};

Page.prototype.text = function(key, defaultValue) {
  return this.value(key, defaultValue).toString();
};

Page.prototype.url = function(mergeVals) {
  mergeVals = mergeVals || {};
  var templateUrl = core.first('page.urlTemplate');
  if (!templateUrl.length) {
    return core.value('request.url');
  }

  var templateValues = core.value('request.params', {});
  for (var k in mergeVals) {
    templateValues[k] = mergeVals[k];
  }

  if ('/' !== templateUrl.trim()[0] && /\s*\w.*\?.*\:.*/.test(templateUrl)) {
    templateUrl = (function(template, ctx) {
      return eval(templateUrl);
    })(templateValues, ctx);
  }

  var url = uriTemplates(templateUrl).fillFromObject(templateValues);

  return url;
};

module.exports = Page;
