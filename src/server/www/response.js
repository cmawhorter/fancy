var path = require('path')
  , fs = require('fs');

var ejs = require('ejs');

var helpers = require('./helpers.js')
  , processComponentHtml = require('./components.js');

function sendHtml(res, html, components, logger) {
  processComponentHtml(html, components, logger, function(err, html) {
    if (err) throw err; // TODO: what should happen when a component throws?
    res.status(200).contentType('text/html; charset=utf-8').send(html);
  });
}

module.exports = function(req, res, viewPath, context, components, logger) {
  var contentType = context.page.text('contenttype', 'text/html')
    , body = context.page.first('body');

  if (contentType.indexOf(';') > -1) {
    contentType = contentType.split(';')[0].trim().toLowerCase();
  }

  switch (contentType) {
    case 'application/json':
      res.json(body);
      return true;
    case 'application/javascript':
      var jsVar = context.page.text('scopetarget', 'window["' + req.url + '"]');
      res.status(200).contentType('application/javascript').send(jsVar + ' = ' + JSON.stringify(body));
      return true;
    case 'text/plain':
      res.status(200).contentType('text/plain').send(body);
      return true;
    default:
    case 'text/html':
      var layout = 'layouts/' + context.page.first('layout', 'primary')
        , layoutPath = path.join(viewPath, layout + '.ejs')
        , viewContents = fs.readFileSync(layoutPath).toString();
      var html = ejs.render(viewContents, {
          locals: context
        , filename: layoutPath
      });
      if (context.__uses) {
        context.resolve(function(err) {
          if (err) {
            throw new Error('Unable to retrieve all uses data');
          }
          res.render(layout, context, function(err, html) {
            if (err) {
              throw new Error('Weird problem rendering layout');
            }
            sendHtml(res, html, components, logger);
          });
        });
      }
      else {
        sendHtml(res, html, components, logger);
      }
      return true;
  }
  return false;
};
