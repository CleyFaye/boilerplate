import {join} from "path";
import {insertTask} from "./util";

/** Add the copy task for a reactApp recipe.
 * 
 * @param {Object} gruntConfig
 * The Grunt configuration to add tasks to.
 * 
 * @param {string} targetName
 * Name of the target for the pug task.
 * 
 * @param {Object} copyOptions
 * Configuration for the pug task.
 * 
 * @param {Object} [copyOptions.options]
 * Valid options to pass directly to grunt-contrib-copy.
 * 
 * @param {string[]} [copyOptions.excludedExtensions]
 * File extensions to not copy.
 * Defaults to [".pug", ".png", ".jpg", ".svg", ".js", ".sass", ".scss"] (file
 * formats handled by other tasks).
 * 
 * @param {string} [copyOptions.sourcePath]
 * Path to take source files from.
 * Defaults to "webres/<targetName>"
 * 
 * @param {string} [copyOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 * 
 * @return {string[]}
 * The name of the tasks added to the gruntConfig object.
 */
export default (gruntConfig, targetName, copyOptions) => {
  const excludedList = (copyOptions.excludedExtensions || []).map(
    ext => `!**/*${ext}`
  );
  const copyTask = {
    options: copyOptions.options,
    files: [{
      expand: true,
      cwd: copyOptions.sourcePath || join("webres", targetName),
      src: [
        "**/*",
        ...excludedList,
      ],
      dest: copyOptions.outputPath || join("dist", targetName),
    }],
  };
  return [insertTask(gruntConfig, "copy", targetName, copyTask)];
};