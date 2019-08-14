import {resolve} from "path";
import {insertTask} from "./util";

/** Add a webpack task for the reactApp recipe
 * 
 * @param {Object} gruntConfig
 * Grunt configuration to add the task to
 * 
 * @param {string} targetName
 * Name of the target for the image minification task.
 * 
 * @param {Object} webpackOptions
 * Options for the webpack task configuration.
 * 
 * @param {bool} [webpackOptions.disableServer]
 * Do not generate the webserver task
 * 
 * @param {Object} [webpackOptions.options]
 * Options for both webpack and webpack-dev-server
 * 
 * @param {Object} [webpackOptions.serverOptions]
 * Options for webpack-dev-server
 * 
 * @param {Object} [webpackOptions.entry]
 * List of entrypoints.
 * Defaults to {targetName: "webres/<targetName>/js/loader.js"}
 * 
 * @param {Object} [webpackOptions.output]
 * Configure webpack output location and name.
 * Defaults to {path: "dist/<targetName>/js", filename: "[name].js"}
 * 
 * @param {string} [webpackOptions.output.path]
 * Path to put the compiled files into.
 * It is possible to pass a completely different object as webpackOptions.output
 * than expected, it will be handed to webpack as-is.
 * 
 * @param {string} [webpackOptions.output.filename]
 * Template for output filename.
 * It is possible to pass a completely different object as webpackOptions.output
 * than expected, it will be handed to webpack as-is.
 * 
 * @param {Object[]} [webpackOptions.loaders]
 * Configuration for webpack loaders. See webpack doc about module.rules.
 * 
 * @param {Object[]} [webpackOptions.plugins]
 * Configuration for webpack plugins. See webpack doc about plugins.
 * 
 * @param {string} [webpackOptions.mode]
 * Build mode. "development", "production" or "none".
 * 
 * @param {string} [webpackOptions.contentPath]
 * Path to static files for web server.
 * Defaults to "dist/<targetName>"
 * 
 * @param {number} [webpackOptions.port]
 * Web server port.
 * 
 * @return {string[]}
 * List of tasks added.
 * This function can add "webpack:<targetName>" and
 * "webpack-dev-server:<targetName>:dev".
 */
export default (gruntConfig, targetName, webpackOptions) => {
  const webpackEntry = webpackOptions.entry || {
    [targetName]: resolve("webres", targetName, "js", "loader.js"),
  };
  const webpackOutput = webpackOptions.output || {
    path: resolve("dist", targetName, "js"),
    filename: "[name].js",
  };
  const webpackConfig = {
    mode: webpackOptions.mode,
    entry: webpackEntry,
    output: webpackOutput,
    module: {
      rules: webpackOptions.loaders,
    },
    plugins: webpackOptions.plugins,
    devServer: {
      contentPath: webpackOptions.contentPath || resolve("dist", targetName),
      port: webpackOptions.port,
    }
  };
  // Special case: I'm not sure I can move options in the task-specific part of
  // the configuration, so I add it at the toplevel of the "webpack" task.
  insertTask(gruntConfig, "webpack", "options", webpackOptions.options);
  const tasks = [];
  tasks.push(
    insertTask(
      gruntConfig,
      "webpack",
      targetName,
      webpackConfig
    )
  );
  tasks.push(
    insertTask(
      gruntConfig,
      "webpack-dev-server",
      `${targetName}:dev`,
      webpackConfig
    )
  );
  return tasks;
};