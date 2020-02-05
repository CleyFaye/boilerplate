import {join} from "path";
import {
  insertTask, GruntConfig,
} from "./util";

import {BaseOptions} from "../util";
import {HandlerFunctionResult} from "../reactapp";

export interface CopyOptions extends BaseOptions {
  options?: object;
  excludedExtensions?: Array<string>;
  extraFiles?: Array<string>;
  skipFiles?: Array<string>;
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
 *
 * @param [copyOptions.extraFiles]
 * Add extra files to copy (to bypass excluded extensions)
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
  copyOptions: CopyOptions,
): HandlerFunctionResult => {
  const srcList = ["**/*"].concat(
    (copyOptions.excludedExtensions ?? []).map(
      (ext) => `!**/*${ext}`,
    ),
  ).concat(
    copyOptions.extraFiles ?? [],
  )
    .concat(
      (copyOptions.skipFiles ?? []).map(
        (fileDef) => fileDef.startsWith("!")
          ? fileDef
          : `!${fileDef}`,
      ),
    );
  const copyTask = {
    options: copyOptions.options,
    files: [
      {
        expand: true,
        cwd: copyOptions.sourcePath ?? join("webres", targetName),
        src: srcList,
        dest: copyOptions.outputPath ?? join("dist", targetName),
      },
    ],
  };
  const requiredTasks = [insertTask(gruntConfig, "copy", targetName, copyTask)];
  const watchTasks = [
    {
      filesToWatch: srcList,
      taskToRun: requiredTasks[0],
    },
  ];
  return {
    requiredTasks,
    handledFiles: srcList,
    watchTasks,
  };
};
