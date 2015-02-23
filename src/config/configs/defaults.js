module.exports = {
  // enforce best practices. if violation is detected process exits immediately
  "strict": true,

  // hidden strict mode settings.  used  to assert config conforms to strict mode on load
  "__strict": {
    "data:formats": [ "yml", "md", "html", "json" ],
    "data:assets": [ "png", "gif", "jpg" ],
    "data:collisions": false,
    "data:routes": [ "explicit" ],
    "compile:yield": false,
    "compile:verify": true,
  },

  "data": {
    // supported extensions for content data
    // note: removing html will also remove support for content directories
    "formats": "json,js,yml,yaml,md,markdown,html,txt",

    // whitelist of types of files that will be served/built in asset directories
    "assets": "png,gif,jpg",

    // allow page routes and asset paths to collide. strict mode forces this to be false
    // e.g. some-page.html/public/a.jpg and theme has theme/public/a.jpg errors
    "collisions": false,

    // restrictions to place on certain content.  useful if combining multiple
    // data sources into single site
    // path is relative to content data directory (which is ./content/data by default)
    "mount": {
      // example: forces properties of all data in ./content/data/blog/ to match
      // "blog": {
      //   // both key and value can be regex
      //   // this example forces all pages in blog to have a route that starts with /blog/
      //   "route": "^/blog/.*",

      //   // either the author or title must be at least 10 chars long, if they exist
      //   "(author|title)": "^(.{10,}|.{0})$",

      //   // negation match. body cannot contain any links to outside pages
      //   // note: this is only an example and should NOT be used as a
      //   // security mechanism!
      //   "body": "!<a[^>]+?href=\"http:[^\"]+?\""
      // },
    },

    // redirect routes with js/meta refresh + canonical
    "redirects": {
      // // uses regex replace to allow to take advantage of backrefs: e.g.  key = key.replace(key, value)
      // "/some/page": "/some-page"
    },

    // url resolving strategy
    //  - exact: route must match exactly
    //  - search: test all routes using url pattern matching
    //  - auto: exact || search, then filter.
    // note: if multiple urls match and collisions are off, a collision error will be thrown
    //    otherwise, the arbitrary first matching result is returned
    "resolution": "auto",

    // determining content routes
    //   - explicit: only the route property is used (required if strict = true)
    //   - auto: explicit if possible, fall back to generate
    "routes": "explicit"
  },

  "theme": {
    // allow themes to yield (create) new pages dynamically
    // e.g. a theme pagination extension creates new pages based on paged content
    "yield": true,

    // import env variables and make available to theme (whitelist)
    "env": {
      // this example means: import the value of process.env.NODE_ENV to env.stage
      // and if it doesn't exist, default to "production"
      // in the theme you can now do <% if (env.stage == 'production') %>
      "stage": [ "NODE_ENV", "production" ]
    },
  },

  "compile": {
    // entry point into the website for compilation.
    // majority of sites won't need to set or modify this
    "entry": "/",

    // verify that all links and assets ultimately resolve to a 200 (possibly through a redirect)
    "verify": true
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
    "destination": ""
  },

  // set default cli args
  "cli": {
    "serve": {
      "port": 8000,
      "workers": 0,
      "content": "content",
      "theme": null,
      "livereloadport": "auto",
      "remotecontrol": true
    },
    "compile": {
    }
  }
};
