import {join} from "path";
import {insertTask} from "./util";

/** Add the pug task for a reactApp recipe.
 * 
 * @param {Object} gruntConfig
 * The Grunt configuration to add tasks to.
 * 
 * @param {string} targetName
 * Name of the target for the pug task.
 * 
 * @param {Object} pugOptions
 * Configuration for the pug task.
 * 
 * @param {Object} [pugOptions.options]
 * Valid options to pass directly to grunt-contrib-pug.
 * Most notably, pugOptions.options.data can be set here.
 * 
 * @param {string} [pugOptions.sourcePath]
 * Path where the pug templates can be found. Subdirectories will be searched.
 * Default to "webres/<targetName>"
 * 
 * @param {string} [pugOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 * 
 * @param {string} [pugOptions.fileSuffix]
 * Suffix for output files. Defaults to ".html"
 * 
 * @return {string[]}
 * The name of the tasks added to the gruntConfig object.
 */
export default (gruntConfig, targetName, pugOptions) => {
  const newPugTask = {
    options: pugOptions.options,
    files: [{
      expand: true,
      cwd: pugOptions.sourcePath || join("webres", targetName),
      src: handledExtensions.map(ext => `**/*${ext}`),
      dest: pugOptions.outputPath || join("dist", targetName),
      ext: pugOptions.fileSuffix || ".html",
    }],
  };
  return [insertTask(gruntConfig, "pug", targetName, newPugTask)];
};

/** File extensions handled by this task */
export const handledExtensions = [".pug"];