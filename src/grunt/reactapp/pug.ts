import {join} from "path";
import {insertTask, GruntConfig} from "./util";
import {BaseOptions} from "../util";

export interface PugOptions extends BaseOptions {
  options?: object;
  sourcePath?: string;
  outputPath?: string;
  fileSuffix?: string;
}

/** File extensions handled by this task */
export const handledExtensions = [".pug"];

/** Add the pug task for a reactApp recipe.
 * 
 * @param gruntConfig
 * The Grunt configuration to add tasks to.
 * 
 * @param targetName
 * Name of the target for the pug task.
 * 
 * @param pugOptions
 * Configuration for the pug task.
 * 
 * @param [pugOptions.options]
 * Valid options to pass directly to grunt-contrib-pug.
 * Most notably, pugOptions.options.data can be set here.
 * 
 * @param [pugOptions.sourcePath]
 * Path where the pug templates can be found. Subdirectories will be searched.
 * Default to "webres/<targetName>"
 * 
 * @param [pugOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 * 
 * @param [pugOptions.fileSuffix]
 * Suffix for output files. Defaults to ".html"
 * 
 * @return
 * The name of the tasks added to the gruntConfig object.
 */
export const handle = (
  gruntConfig: GruntConfig,
  targetName: string,
  pugOptions: PugOptions
): Array<string> => {
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