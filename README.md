Some webapp boilerplate
===============================

Note: this is legacy stuff. Low maintenance (well, lower than before). We moved toward better
options, that directly embeds most of the work with tsc, babel and webpack.

This repository is a small set of functions to help setting up simple webapps.

It provides Grunt tasks to transpile a webapp so it can work in most browsers.

These tools allows some level of configuration, but most default options expects a specific
directory layout for your project.

This is not a "starter project" but an actual dependency to keep in your project.

Install it using

```shell
npm install -D @cley_faye/boilerplate
```

Managing dependencies
---------------------
This project does not "really" depend on anything, since all parts are optional.
However, some dependencies are required for things to work.

Instead of forcing all optional dependencies to come with, I decided to document here what is
required, and for what. It's up to the calling project to have the proper dependencies.
(this will also avoid dependency version nightmares).

For webapp building:

- babel-loader
- @babel/core
- @babel/preset-env
- @babel/preset-react
- babel-plugin-transform-define
- core-js
- @babel/plugin-transform-runtime
- grunt-contrib-pug
- grunt-contrib-copy
- grunt-contrib-watch
- grunt-sass
- sass
- grunt-webpack
- grunt
- ts-loader (for supporting TypeScript import in webpack/babel)

Peer dependencies are used to limit major version mismatch.

Webapp side
-----------
There's a set of functions that provide Grunt tasks for the following:

- Parsing pug templates
- Compress images
- Using webpack to transpile JavaScript
- Compile SASS stylesheet into CSS
- Copy all files not handled by above tasks

The expected directory layout for this is to put everything related to the webapp part of your
project in a directory names `webres/<targetname>`.
This directory will be called the "webapp" directory in the following sections.
The target name is the name you provide to the `reactApp()` function.

Outputs will be produced in the `dist/<targetname>` directory.
This will be called the "output" directory in the following sections.

This file shows the basic features; for more advanced control you can inspect options objects in
each files from `src/grunt/reactapp`.

Basic usage
-----------
You can call the `reactApp()` function to populate a Grunt configuration with tasks required for the
webapp.

Example in a minimal Gruntfile (meaning, I keep all the task loading and extra cruft out of this
example):

```JavaScript
const {
  reactApp,
  reactAppDynamicTasks,
} = require("@cley_faye/boilerplate/grunt.js");

module.exports = grunt => {
  const baseGruntConfig = {};
  const reactAppConfig = {
    pug: {},
    image: {},
    webpack: {},
    sass: {},
    copy: {},
  };
  const requiredTasks = reactApp(
    baseGruntConfig,
    "myAppName",
    reactAppConfig
  );
  grunt.initConfig(baseGruntConfig);
  reactAppDynamicTasks(grunt, baseGruntConfig);
  grunt.registerTask(
    "myWebApp",
    "Build the webapp",
    requiredTasks
  );
};
```

This would register a task names "myWebApp", process files in `webres/myAppName` and output in
`dist/myAppName` using most defualt options.
Each different tasks can have his own options, described below.
Each task also have a `disabled` property that can be set to `true`, in which case it will not
generate the corresponding task.

The `reactAppDynamicTasks()` call is required to implement some asynchronous features.
Currently this is used to provide dynamic data to pug templates.

### Pug templates
Any file with the `.pug` suffix in the webapp directory will be processed and put in the output
directory, reproducing the directory structure from the webapp directory.
The pug options support a `fileSuffix` property, which will affect the output file names.
Defaults to `.html`.
It also supports an `options` property passed as-is to grunt-contrib-pug.
Most notably, `options.data` can be set here to provide data to the templates.

It is possible to setup a property named `dynamicData` on the pug config object.
This property must be a function that returns a promise.
The result of that promise will be merged into the data object passed to pug,
allowing data to be updated with asynchronous sources at build time.

### Image files
All `.jpg`, `.png` and `.svg` files in the webapp directory will be compressed
as best as possible and put in the output directory.

```TODO
Future versions will allow specifying per-image options, so one can keep high resolution files
around and still produce optimal files for web distribution.
```

### Webpack
Take the provided entries (there's a sensible default) and create a bundle for web distribution.
The default settings apply a set of features: eslint parsing, babel with some generic settings that
targets recent browsers, control over some development features of webpack…

The webpack options support a host of properties:

- options: passed as-is to grunt-webpack
- entry: list of entrypoints. Defaults to using a single entrypoint named
  `webres/<targetname>/js/loader.js`.
- worker: list of worker entrypoints.
- externals: record describing external dependencies (dependencies that will not be bundled in the
  bundle).
  Key are the "require" name, value is the  variable that will have to exist at runtime.
- output: where to put the bundle. Defaults to `dist/<targetname>/js/<targetname>.js`
- loaders: loaders that parse the input files before bundling.
  Defaults to using Babel and eslint. It is possible to keep using these defaults with some
  customizations by using `webpackLoadersDefault()`.
- plugins: webpack plugins to use
- babelPlugins: array of plugins for Babel
- mode: The build mode. "development", "production" or "none"
- defines: a record of value to define using Babel transform-define
- resolve: a custom "resolve" object for webpack config
- generateReport: a boolean, set to true to generate a bundle size report HTML file

### SASS
All `.sass` and `.scss` files in the `webres` directory will be processed as `.css` files
in the output directory, except for files named `.inc.*`.

### Copy task
It is possible to move other file types into the output directory using the copy task.
Any file not handled by the other tasks will be copied as-is into the output directory.

JavaScript files are expected to be handled by webpack; if you have a JavaScript file you want to
copy as-is (or any other file excluded by the default filters), you can provide them as a list in
the `extraFiles` property for that task options.

### Shared settings
The "production" mode setting requires changes among multiple tasks.
It is possible to configure them in one call using `reactAppOptionsHelper()`.

The example from before can become:

```JavaScript
const {
  reactApp,
  reactAppOptionsHelper,
} = require("@cley_faye/boilerplate/grunt.js");

module.exports = grunt => {
  const baseGruntConfig = {};
  const reactAppConfig = {
    pug: {},
    image: {},
    webpack: {},
    sass: {},
    copy: {},
  };
  const requiredTasks = reactApp(
    baseGruntConfig,
    "myAppName",
    reactAppOptionsHelper(
      {
        production: !!grunt.option("prod"),
      },
      reactAppConfig
    )
  );
  grunt.initConfig(baseGruntConfig);
  grunt.registerTask(
    "myWebApp",
    "Build the webapp",
    requiredTasks
  );
};
```

By using the helper, in addition to setting options for various build steps, some variables are
defined:

- for pug, `productionBuild` is available in the template and is a boolean
- for Babel/Webpack: `process.env.BUILD_TYPE` will be set to either `development` or `production`

### Watcher
All files except those parsed by webpack can be watched for updates and automatically trigger their
task when needed.
Simply run `npx grunt watch` to start the watcher.
It is also configured to have a livereload server on port 35729.
To change the default port, pass a `watch` property in `options` (third argument of `reactApp()`) or
to the helper options (first argument of `reactAppOptionsHelper()`).
The option can be either a boolean to enable/disable the feature, or a number.
Passing `false` will disable the generation of the `watch` task.

Webpack tasks can also be watched by manually running the `webpack:<target name>_watch` target in
another terminal.

Grunt configuration
-------------------
To unify the way extra options are taken from Grunt, a function named `getOpts()` is exported by
`@cley_faye/boilerplate/lib/grunt`.
It provide basic type checking and inline help display for arguments passed to Grunt.

Usage:

```JavaScript
const {getOpts, OptType} = require("@cley_faye/boilerplate/grunt.js");
module.exports = grunt => {
  const opts = getOpts(
    grunt,
    {
      "textOpt": {
        description: "Some helpful description",
        type: OptType.STRING,
      },
      "boolOpt": {
        type: OptType.BOOLEAN,
        defaultValue: true,
      },
    },
  );
  if (opts.boolOpt) {
    // do something
  }
}
```

All described options are mandatory unless a default value is specified.
Accepted value type are `OptType.STRING`, `OptType.NUMBER`, `OptType.BOOLEAN`.
For string and numbers, the value must be passed using the syntax `--text-opt="some text"` (quotes
are optional).
For boolean value, the presence of the option is enough (`--bool-opt`).
It can be prefixed with `no-` to disable it (`--no-bool-opt`).

All names provided in the config are converted to kebab-case for the command line.

If `--help` is passed to the command line, an additional help message will be displayed on the
output, using the provided descriptions if available.

Extra middleware
----------------

### singlepageapp
If you want to serve a statically built webapp based on a single html entrypoint, you can use the
middleware provided in `/lib/express/middlewares/singlepageapp.js`.

Basic usage:

```JavaScript
import express from "express";
import {singlePageApp} from "@cley_faye/boilerplate/lib/express/middlewares/singlepageapp.js";

const someRouter = express.Router();
someRouter.use("/app", singlePageApp({rootDir: "dist/webapp"});
```

Available config options are:

- `rootDir`: mandatory, root directory containing the SPA
- `htmlFile`: optional, name of the HTML file to serve (defaults to "index.html")
- `staticRootDirectories`: optional, name of directories (in the above root directory) to serve as
  static files. Defaults to `["js", "css", "img"]`.

A convenience command is available as "serve_spa" to be called from the command line.
It is possible to pass it some parameters; run it with `--help` for more informations.
To use this tool, `minimist` must be installed in addition to express dependencies.

Using TypeScript
-----------------
Typical use of TypeScript implies converting `.ts` file to `.js`.
For a React app using webpack, there's two approach: either instruct webpack to accept `.ts` files
(for example, using `ts-loader`) or have your entry point be a `.js` file that imports the generated
output from TypeScript.
If you reference the output of the TypeScript compiler, you can keep it updated using `npx tsc -w`.

Using `ts-loader` can be done automatically by setting the `typescript` property in the webpack
configuration to `true`.
If a `tsconfig-tsloader.json` file exists at the root of the project, it will be used instead of
`tsconfig.json`.

For Express app, there is no particular things to take care, except that if you use a facility like
`nodemon` you have to watch the TypeScript output instead of the actual source files.
