import handlePug from "./reactapp/pug";
import handleImage from "./reactapp/image";
import handleWebpack from "./reactapp/webpack";

/** Insert necessary build step for a React/Web app.
 * 
 * This function will add the following Grunt tasks:
 * - pug:<targetName>: transform pug templates
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
 * @return {string[]}
 * A list of tasks added to gruntConfig for this recipe.
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