import {join} from "path";
import {insertTask} from "./util";

/** Add an image minification task to the Grunt configuration
 * 
 * @param {Object} gruntConfig
 * Grunt configuration to add the task to
 * 
 * @param {string} targetName
 * Name of the target for the image minification task.
 * 
 * @param {Object} imageOptions
 * Options for the image task configuration.
 * 
 * @param {Object} imageOptions.options
 * Options to pass to grunt-contrib-imagemin.
 * 
 * @param {string} [imageOptions.sourcePath]
 * Path where the pug templates can be found. Subdirectories will be searched.
 * Default to "webres/<targetName>"
 * 
 * @param {string} [imageOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 * 
 * @return {string[]}
 * List of tasks added to the grunt configuration
 */
export default (gruntConfig, targetName, imageOptions) => {
  const newImageTask = {
    options: imageOptions.options,
    files: [{
      expand: true,
      cwd: imageOptions.sourcePath || join("webres", targetName),
      src: handledExtensions.map(ext => `**/*${ext}`),
      dest: imageOptions.outputPath || join("dist", targetName),
    }],
  };
  return [insertTask(gruntConfig, "imagemin", targetName, newImageTask)];
};

/** File extensions handled by this task */
export const handledExtensions = [".jpg", ".png", ".svg"];