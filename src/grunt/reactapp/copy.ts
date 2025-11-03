import {join} from "path";

import {type HandlerFunctionResult} from "../reactapp.js";
import {type BaseOptions} from "../util.js";

import * as util from "./util.js";

export interface CopyOptions extends BaseOptions {
  options?: Record<string, unknown>;
  excludedExtensions?: Array<string>;
  extraFiles?: Array<string>;
  skipFiles?: Array<string>;
  sourcePath?: string;
  outputPath?: string;
  dot?: boolean;
}

/** Add the copy task for a reactApp recipe.
 *
 * @param gruntConfig - The Grunt configuration to add tasks to.
 *
 * @param targetName - Name of the target for the pug task.
 *
 * @param copyOptions - Configuration for the pug task.
 *
 * @returns
 * The name of the tasks added to the gruntConfig object.
 */
export const handle = (
  gruntConfig: util.GruntConfig,
  targetName: string,
  copyOptions: CopyOptions,
): HandlerFunctionResult => {
  const srcList = ["**/*"]
    .concat((copyOptions.excludedExtensions ?? []).map((ext) => `!**/*${ext}`))
    .concat(copyOptions.extraFiles ?? [])
    .concat(
      (copyOptions.skipFiles ?? []).map((fileDef) =>
        fileDef.startsWith("!") ? fileDef : `!${fileDef}`,
      ),
    );
  const copyTask = {
    options: copyOptions.options,
    files: [
      {
        cwd: copyOptions.sourcePath ?? join("webres", targetName),
        dest: copyOptions.outputPath ?? join("dist", targetName),
        dot: copyOptions.dot,
        expand: true,
        src: srcList,
      },
    ],
  };
  const requiredTasks = [util.insertTask(gruntConfig, "copy", targetName, copyTask)];
  const watchTasks = [{filesToWatch: srcList, taskToRun: requiredTasks[0]}];
  return {handledFiles: srcList, requiredTasks, watchTasks};
};
