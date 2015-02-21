Fancy
=====

Chocked full of convention and sane defaults.

## Goals

A static site and web app generator that doesn't try to shoehorn the web into a desktop software paradigm.

## Config

Add a `fancy` entry to your sites package.json or alternatively create a fancy.json file in your site root.

```javascript
{
  "name": "MyFancyWebsite",
  // ... snip ...
  "fancy": {
    // enforce best practices
    "strict": true,

    "data": {
      // supported extensions for content data
      // note: removing html will also remove support for content directories
      "formats": "json,js,yml,yaml,md,markdown,html,txt",

      // whitelist of types of files that will be served/built in asset directories
      "assets": "png,gif,jpg",
      
      // restrictions to place on certain content.  useful if combining multiple
      // data sources into single site
      // path is relative to content data directory (which is ./content/data by default)
      "mount": {
        // example: forces properties of all data in ./content/data/blog/ to match
        "blog": {
          // both key and value can be regex
          // this example forces all pages in blog to have a route that starts with /blog/
          "route": "^/blog/.*", 

          // either the author or title must be at least 10 chars long, if they exist
          "(author|title)": "^(.{10,}|.{0})$",

          // negation match. body cannot contain any links to outside pages
          // note: this is only an example and should NOT be used as a 
          // security mechanism!
          "body": "!<a[^>]+?href=\"http:[^\"]+?\""
        },
      }
    },

    // import env variables and make available to theme (whitelist)
    "env": {
      // this example means: import the value of process.env.NODE_ENV to env.stage
      // and if it doesn't exist, default to "production" 
      // in the theme you can now do <% if (env.stage == 'production') %>
      "stage": [ "NODE_ENV", "production" ] 
    },

    "compile": {
      // resolving url to content
      //   - explicit: only the route property is used (required if strict = true)
      //   - generate: a route is generated based on filepath 
      //   - auto: explicit if possible, fall back to generate
      "resolution": "auto",
    },

    "build": {
      // store build here
      "path": "./dist",

      // extension built files will have.  by default, their name will match their
      // route as closely as possible
      "extension": "",

      // by default, site runs out of root:  e.g www.example.com/about
      // change this if you'd like the site to run in a sub 
      // directory: e.g. destination: "/some-subdirectory/" ww.example.com/some-subdirectory/about
      "destination": "/",

      // minify rendered html.  
      // if you need minifying/concat of js and css, it should be built into your theme dev workflow
      "minify": true,

      // build options for assets
      "assets": {
        // store assets here. relative to build.path: e.g. "../dist" would be the same as putting "."
        "path": ".",

        // changing this to anything other than assets.path will probably result in images 
        // no longer working unless you know what you're doing and have a good reason
        "destination": ".",
      }
    },

    "deploy": {
      "target": ""
    },

    // set default cli args
    "cli": {
      "serve": {
        "port": 8000,
        "workers": 0,
        "content": "content",
        "theme": null,
        "livereloadport": "auto"
      }
    }
  }
}

```
