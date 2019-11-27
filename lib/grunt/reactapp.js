import {deepSet} from "./util";
import handlePug from "./reactapp/pug";
import handleImage from "./reactapp/image";
import handleWebpack from "./reactapp/webpack";
import handleSass from "./reactapp/sass";
import handleCopy from "./reactapp/copy";

/** Insert necessary build step for a React/Web app.
 * 
 * This function will add the following Grunt tasks:
 * - "pug:<targetName>": transform pug templates
 * - "imagemin:<targetName>": compress images
 * - "webpack:<targetName>": bundle JavaScript
 * - "webpack:<targetName>:dev": start the webpack dev server
 * - "sass:<targetName>": compile sass/scss files
 * - "copy:<targetName>": copy files not handled in other tasks
 * 
 * @param {Object} gruntConfig
 * The Grunt configuration with other tasks, before it is passed to
 * grunt.initConfig()
 * 
 * @param {string} [targetName]
 * Name for the various targets added to Grunt. Defaults to "reactApp"
 * 
 * @param {Object} [options]
 * Options to control the extra tasks
 * 
 * @param {Object} [options.pug]
 * Options for the pug task. See pug.js for details.
 * 
 * @param {bool} [options.pug.disabled]
 * Do not generate pug task
 * 
 * @param {Object} [options.image]
 * Options for the image task. See image.js for details.
 * 
 * @param {bool} [options.image.disabled]
 * Do not generate image task
 * 
 * @param {Object} [options.webpack]
 * Options for the webpack task. See webpack.js for details.
 * 
 * @param {bool} [options.webpack.disabled]
 * Do not generate webpack task
 * 
 * @param {Object} [options.sass]
 * Options for the sass task. See sass.js for details.
 * 
 * @param {bool} [options.sass.disabled]
 * Do not generate sass task
 * 
 * @param {Object} [options.copy]
 * Optiosn for the copy task. See copy.js for details.
 * 
 * @param {bool} [options.copy.disabled]
 * Do not generate copy task
 * 
 * @return {string[]}
 * List of tasks to build the application
 */
export const reactApp = (
  gruntConfig,
  targetName = "reactApp",
  options = null
) => {
  if (options === null) {
    options = {};
  }
  const handlers = {
    pug: handlePug,
    image: handleImage,
    webpack: handleWebpack,
    sass: handleSass,
    copy: handleCopy,
  };
  const addedTasks = Object.keys(handlers)
    .reduce(
      (acc, cur) => acc.concat(
        (options[cur] && options[cur].disabled)
          ? []
          : handlers[cur](
            gruntConfig,
            targetName,
            options[cur] || {}
          )
      ),
      []
    );
  return addedTasks;
};

/** Helper for common options shared across multiple tasks.
 * 
 * @param {Object} [helperOptions]
 * Options shared by multiple tasks
 * 
 * @param {bool} [helperOptions.production]
 * Make a production build.
 * - set outputStyle and sourceMap for sass
 * - set pretty for pug
 * - add a "productionBuild" property in pug data
 * - set mode for webpack
 * 
 * @param {Object} [options]
 * Initial options for reactApp().
 * This object will be copied and required parameters will be added by this
 * function.
 * Modified object are also duplicated, so no original data is modified.
 * 
 * @return {Object}
 * A configuration object for reactApp().
 */
export const reactAppOptionsHelper = (helperOptions, options) => {
  let result = deepSet(options, "sass.options.outputStyle",
    helperOptions.production ? "compressed" : "nested");
  result = deepSet(result, "sass.options.sourceMap",
    helperOptions.production ? false : true);
  result = deepSet(result, "pug.options.pretty",
    helperOptions.production ? false : true);
  result = deepSet(result, "pug.options.data.productionBuild",
    helperOptions.production ? "true" : "false");
  result = deepSet(result, "webpack.mode",
    helperOptions.production ? "production" : "development");
  return result;
};
