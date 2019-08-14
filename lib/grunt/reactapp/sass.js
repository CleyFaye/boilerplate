import {join} from "path";
import {insertTask} from "./util";

/** Add an sass processing task to the Grunt configuration
 * 
 * @param {Object} gruntConfig
 * Grunt configuration to add the task to
 * 
 * @param {string} targetName
 * Name of the target for the image minification task.
 * 
 * @param {Object} sassOptions
 * Options for the sass task configuration.
 * 
 * @param {Object} sassOptions.options
 * Options to pass to grunt-sass.
 * 
 * @param {string} [sassOptions.sourcePath]
 * Path where the pug templates can be found. Subdirectories will be searched.
 * Default to "webres"
 * 
 * @param {string} [sassOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 * 
 * @return {string[]}
 * List of tasks added to the grunt configuration
 */
export default (gruntConfig, targetName, sassOptions) => {
  const sassTask = {
    options: sassOptions.options,
    files: [{
      expand: true,
      cwd: sassOptions.sourcePath || "webres",
      src: "**/*.(scss,sass)",
      dest: sassOptions.outputPath || join("dist", targetName),
    }],
  };
  return [insertTask(gruntConfig, "sass", targetName, sassTask)];
};