import {join} from "path";
import {insertTask, GruntConfig} from "./util";

import {handledExtensions as imageExt} from "./image";
import {handledExtensions as pugExt} from "./pug";
import {handledExtensions as sassExt} from "./sass";
import {handledExtensions as webpackExt} from "./webpack";
import {BaseOptions} from "../util";

export interface CopyOptions extends BaseOptions {
  options?: object;
  excludedExtensions?: Array<string>;
  sourcePath?: string;
  outputPath?: string;
}

/** Add the copy task for a reactApp recipe.
 * 
 * @param gruntConfig
 * The Grunt configuration to add tasks to.
 * 
 * @param targetName
 * Name of the target for the pug task.
 * 
 * @param copyOptions
 * Configuration for the pug task.
 * 
 * @param [copyOptions.options]
 * Valid options to pass directly to grunt-contrib-copy.
 * 
 * @param [copyOptions.excludedExtensions]
 * File extensions to not copy.
 * Defaults to [".pug", ".png", ".jpg", ".svg", ".js", ".sass", ".scss"] (file
 * formats handled by other tasks).
 * 
 * @param [copyOptions.sourcePath]
 * Path to take source files from.
 * Defaults to "webres/<targetName>"
 * 
 * @param [copyOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 * 
 * @return
 * The name of the tasks added to the gruntConfig object.
 */
export const handle = (
  gruntConfig: GruntConfig,
  targetName: string,
  copyOptions: CopyOptions
): Array<string> => {
  const srcList = ["**/*"].concat(
    (copyOptions.excludedExtensions || [
      ...imageExt,
      ...pugExt,
      ...sassExt,
      ...webpackExt,
    ]).map(
      ext => `!**/*${ext}`
    )
  );
  const copyTask = {
    options: copyOptions.options,
    files: [{
      expand: true,
      cwd: copyOptions.sourcePath || join("webres", targetName),
      src: srcList,
      dest: copyOptions.outputPath || join("dist", targetName),
    }],
  };
  return [insertTask(gruntConfig, "copy", targetName, copyTask)];
};