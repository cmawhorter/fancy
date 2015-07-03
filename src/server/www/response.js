var path = require('path')
  , fs = require('fs');

var ejs = require('ejs');

var helpers = require('./helpers.js')
  , processComponentHtml = require('./components.js');

function sendHtml(res, html, components, logger, callback) {
  processComponentHtml(html, components, logger, function(err, html) {
    if (err) {
      return callback(new Error('Error rendering components: ' + err.message));
    }
    res.status(200).contentType('text/html; charset=utf-8').send(html);
    callback(null);
  });
}

function render(viewContents, values) {
  try {
    return ejs.render(viewContents, values);
  }
  catch (err) {
    return err;
  }
}

module.exports = function(req, res, viewPath, context, components, logger, callback) {
  var contentType = context.page.text('contenttype', 'text/html')
    , body = context.page.first('body');

  if (contentType.indexOf(';') > -1) {
    contentType = contentType.split(';')[0].trim().toLowerCase();
  }

  switch (contentType) {
    case 'application/json':
      res.json(body);
      return callback(null);
    case 'application/javascript':
      var jsVar = context.page.text('scopetarget', 'window["' + req.url + '"]');
      res.status(200).contentType('application/javascript').send(jsVar + ' = ' + JSON.stringify(body));
      return callback(null);
    case 'text/plain':
      res.status(200).contentType('text/plain').send(body);
      return callback(null);
    default:
    case 'text/html':
      var layout = 'layouts/' + context.page.first('layout', 'primary')
        , layoutPath = path.join(viewPath, layout + '.ejs')
        , viewContents = fs.readFileSync(layoutPath).toString();
      var html = render(viewContents, {
          locals: context
        , filename: layoutPath
      });
      if (html instanceof Error) {
        return callback(html);
      }
      else {
        if (context.__uses) {
          context.resolve(function(err) {
            if (err) {
              return callback(new Error('Unable to retrieve all uses data: ' + err.message));
            }
            res.render(layout, context, function(err, html) {
              if (err) {
                return callback(new Error('Weird problem rendering layout: ' + err.message));
              }
              return sendHtml(res, html, components, logger, callback);
            });
          });
        }
        else {
          return sendHtml(res, html, components, logger, callback);
        }
      }
      return;
  } // switch (contentType) {
};
