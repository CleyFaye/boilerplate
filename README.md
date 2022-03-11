Some Express/Webapp boilerplate
===============================
This repository is a small set of functions to help setting up simple webapps/Express services.

It's made of two parts: one that help setting up Express quickly, and one that provide Grunt tasks
to transpile a webapp so it can work in most browsers.

These tools allows some level of configuration, but most default options expects a specific
directory layout for your project.

Managing dependencies
---------------------
This project does not "really" depend on anything, since all parts are optional.
However, some dependencies are required for things to work.

Instead of forcing all optional dependencies to come with, I decided to document here what is
required, and for what. It's up to the calling project to have the proper dependencies.
(this will also avoid dependency version nightmares).

For webapp building:

- resolve-typescript-plugin (due to the way webpack plugins are handled, this is mandatory for dev
  install)
- babel-loader
- eslint-webpack-plugin
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

For express:

- express
- winston
- express-winston

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

### SASS
All `.sass` and `.scss` files in the webapp directory will be processed as `.css` files in the
output directory, except for files named `.inc.*`.

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

Express application definition
------------------------------
The express helper actually provide a single place to configure most of the express pipeline with
some generic options and generic-ish way to provide routes.

It is limited to a very simple set of features but avoid having to retype them all the time.
Some standard security features are not defined here; my personal usecases usually involves having a
secure webserver in front that takes care of most headers.

Default settings operate using winston for logging.

To define your express app, you can call `createPipeline()`.

Quick sample:

```JavaScript
import express from "express";
import {createPipeline} from "@cley_faye/boilerplate/lib/express.js";

const app = express();
app.use(createPipeline({
  topLevels: [],
  routes: [],
  statics: [],
  postStatics: [],
  errorHandlers: [],
  options: {
    log: {},
    middleware: {},
    defaultErrorHandler: true,
  }
}));

export default app;
```

This will not serve anything by default, but display most top-level options that can be provided at
this point.

### Options
The log options can be used to control the express server logging behavior.
It supports the following properties:

- route: log all route called. Can be either a boolean or an express-winston configuration.
  In the later case, all properties are accepted except the winston instance, which is set
  separately.
  More details in the "custom logging" section below.
- error: log all errors. Accept a boolean, or an object with the "collapseNodeModules" boolean
  property.
- logger: an instance of a winston logger.
- timestamp: set to true to prepend a timestamp to each log line

The middleware options allow enabling/disabling common middlewares.
Currently only support a few builtin middlewares from express:

- `json`, to enable auto-parsing of json body.
- `urlencoded`, to parse parameters from the query string
- `text`, to populate body with the raw request as a string
- `raw`, to populate body with the raw request content

Each of these options accept either `true` (to use their default behavior) or an object with their
configuration as specified in the ExpressJS manual.

The `defaultErrorHandler` property enable a final error handler.
It's behavior is to intercept errors/exceptions and return them as a reply.
If the error is a proper error object (from `http-errors`), it will return the message (if expose is
true) and the statusCode.
If the request declares that it can accept json, the error is sent back as a json object with
`statusCode` and `message`.
Otherwise the message is sent as a plaintext reply.

### Defining routes
`topLevels`, `routes` and `postStatics` are arrays of handlers.
Each handler can be either another Router (for route composition), a simple handler without route
specification (a simple `req, res, next` function), or a complete route definition in the form of an
object with the following properties:

- route: the route to handle
- handler: the route handler (or an array, or a Router)
- method: the method this route should handle. Defaults to "get".

### Defining error handlers
The `errorHandlers` property accept an array of functions that follow the express "error handler"
kind of functions (four parameters: `err`, `req`, `res` and `next`).
If provided, and if the default error handler is set, they will be called before it.

### Providing statics
To serve static files, the `statics` property can be used.
It's an array of either directly the path to a directory, in which case it will be served at the
root of the service, or an object with the following properties:

- root: The directory where the static files are
- options: The options to pass to express static handler
- route: The route under which the static files will be served

### Custom logging
The default configuration (by setting `options.log.route: true`) allows some level of customization
of the actual logged data.
If a custom object is passed instead of `true`, the following will not automatically apply.

By default, all body content is logged.
To finely tune what body elements are logged on each route the `bodyLogger()` middleware can be
used.
It takes two parameters, the first one is an array of properties that *should* be logged, the second
one can be a custom object or a function returning a custom object with extra properties to log.

For example, for a login route, you might want to hide the provided password but still get some info
(note: this is an example, in practice you probably shouldn't care about this)

```JavaScript
router.post(
  "/login",
  bodyLogger(
    ["login"],
    req => ({
      passwordLength: req.body.password.length,
    }),
  ),
  processLogin,
);
```

In addition to excluding properties from the body of a request and adding custom properties, it can
be useful to always identify a request coming from a logged-in user.

You can provide a `userFromReq` property to the `options.log` configuration.
It should be a function that receive `req` as its argument and returns a string identifying the
logged-in user.

### Configuring global aspects of an Express App

#### Configuring the template engine

```JavaScript
import {setViewEngine} from "@cley_faye/boilerplate/lib/express.js";

const app = express();
setViewEngine(app, "pug", "webres/views", {});
```

The last parameter is optional; if provided it will define values available to the template engine.

Running Express application
---------------------------
Once the express application is defined, it need to be started to serve files and resources.
A helper is provided to do so, using the `appStart()` function.

```JavaScript
import {consoleLogger} from "@cley_faye/boilerplate/lib/winston.js";
import app from "./app.js";
import {appStart} from "@cley_faye/boilerplate/lib/express.js";

appStart({
  app,
  allowNonLocal: false,
  port: 3000,
  shutdownFunction: () => {;},
  logger: consoleLogger,
}).then(({port, server}) => {;});
```

The settings are:

- allowNonLocal: listen only to localhost or not
- port: port to listen to. Can be 0 to use a random available port
- shutdownFunction: a function to call after the server stop listening
- logger: a winston logger to log that the server started listening

The function returns a promise that resolve with the actual port used for listening when the server is started.

The server is automatically registered using the `autoclose` part to stop when a SIGINT signal is
received.
It is also possible to trigger a stop by calling the `closeServer()` function on
`@cley_faye/boilerplate/lib/express/autoclose.js`.
This feature only supports one server at a time.

Console logging
---------------
For convenience, a winston logger using console as output is provided:

```JavaScript
import {consoleLogger} from "@cley_faye/boilerplate/lib/winston.js";

consoleLogger.info("Log line");
```

Using TypeScript
-----------------
Typical use of TypeScript implies converting `.ts` file to `.js`.
For a React app using webpack, there's two approach: either instruct webpack to accept `.ts` files
(for example, using `ts-loader`) or have your entry point be a `.js` file that imports the generated
output from TypeScript.
If you reference the output of the TypeScript compiler, you can keep it updated using `npx tsc -w`.

Using `ts-loader` can be done automatically by setting the `typescript` property in the webpack
configuration to `true`.

For Express app, there is no particular things to take care, except that if you use a facility like
`nodemon` you have to watch the TypeScript output instead of the actual source files.

REPL
----
This library provides a function to start a simple REPL instance (using node's built-in repl module)
to provide access to JavaScript features.

Basic usage includes predefined behavior for providing a database object and a list of services.
The export is in `lib/repl.js`.
