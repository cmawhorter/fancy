module.exports = {
  // enforce best practices. if violation is detected process exits immediately
  "strict": true,

  // hidden strict mode settings.  used  to assert config conforms to strict mode on load
  "__strict": {
    "data:formats": [ "yml", "md", "html", "json" ],
    "data:assets": [ "png", "gif", "jpg", "ico" ],
    "data:collisions": false,
    "data:routes": [ "explicit" ],
    "compile:yield": false,
  },

  "data": {
    // supported extensions for content data
    // note: removing html will also remove support for content directories
    "formats": "json,js,yml,yaml,md,markdown,html,txt",

    // whitelist of types of files that will be served/built in asset directories
    "assets": "png,gif,jpg,ico",

    // allow page routes and asset paths to collide. strict mode forces this to be false
    // e.g. some-page.html/public/a.jpg and theme has theme/public/a.jpg errors
    // TODO: also need to make sure data routes don't collide with asset routes, e.g. /imgs/something -> route = /imgs/something
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

      //   // negation match. body cannot contain any links to outside pages
      //   // note: this is only an example and should NOT be used as a
      //   // security mechanism!
      //   "body": "!<a[^>]+?href=\"http:[^\"]+?\""
      // },
    },

    // redirect routes with js/meta refresh + canonical
    "redirects": {
      // // uses regex replace to allow to take advantage of backrefs: e.g.  key = key.replace(key, value)
      // "/(\\w+)/page": "/?src=some-page"
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

    // aliases and additions are very similar.  here's two ways to achieve the same result
    //
    // "aliases": { // here we're using aliases to add the resource name "blogpost" to all resource=ideas content
    //   "resource": {
    //     "ideas": "blogpost"
    //   }
    // }
    //
    // "additions": { // here we're doing the same thing, but we aren't limited to one property
    //   "resource": {
    //     "ideas": {
    //       "resource": "blogpost",
    //       "author": "An author, if you want"
    //     }
    //   }
    // }

    // alias matching properties to a new value e.g. resource.myresourcename = "blogpost" to support a blog
    // this exists so that data and theme can be independent of one another
    "aliases": {
      // "route": {
      //   "/": "/another-home"
      // },
      // "resource": {
      //   "ideas": "blogpost",
      //   "todo": "blogpost",
      //   "rant": "blogpost",
      //   "crazyrant": "blogpost",
      // }
    },

    // additions are very similar to aliases, but much more powerful and runs AFTER aliases.
    "additions": {
      // "route": {
      //   "/": {
      //     "route": "/another-home",
      //     "title": "another title"
      //   }
      // },
      // "resource": {
      //   "blogpost": { // our aliased resource from above

      //   },
      //   "ideas": {
      //     "category": "Idea"
      //   },
      //   "todo": {
      //     "category": "To-do"
      //   },
      //   "rant": {
      //     "category": "Rant"
      //   },
      //   "crazyrant": {
      //     "category": "Crazy Rant",
      //     // could now include <%= page.disclaimer %> in your theme for our crazy rants
      //     "disclaimer": "This is a crazy rant. You've been warned."
      //   },
      // }
    }
  },

  "compile": {
    // entry point into the website for compilation.
    // majority of sites won't need to set or modify this
    "entry": "/",

    // list of routes you want to force the compiler to include.
    // mainly useful when using redirects that aren't being picked up
    "force": [
    ]
  },

  "build": {
    // store build here
    "path": "./dist",

    // extension built files will have.  by default, their name will match their
    // route as closely as possible
    "extension": "html",

    // force all files to have the specified extension.  by default, onl files
    // without an existing extension will get one
    "forceextension": false,

    // by default, site runs out of root:  e.g www.example.com/about
    // change this if you'd like the site to run in a sub
    // directory: e.g. destination: "/some-subdirectory/" ww.example.com/some-subdirectory/about
    "destination": "/",

    // build options for assets
    "assets": {
      // store assets here. relative to build.path: e.g. "../dist" would be the same as putting "."
      "destination": ".",
    }
  },

  // placeholder for future deploy implementation
  "deploy": {
    // "destination": ""
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
