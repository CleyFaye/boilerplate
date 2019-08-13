import handlePug from "./reactapp/pug";

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
  let addedTasks = [];
  addedTasks = addedTasks.concat(handlePug(
    gruntConfig,
    targetName,
    options.pug));
  return addedTasks;
};