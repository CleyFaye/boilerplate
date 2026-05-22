import {join} from "path";

import {type HandlerFunctionResult} from "../reactapp.js";
import {type BaseOptions} from "../util.js";

import * as util from "./util.js";

/** File extensions handled by this task */
const handledExtensions = [".scss", ".sass"];

interface SassOptionsOptions {
  implementation?: Record<string, unknown>;
}

export interface SassOptions extends BaseOptions {
  options?: SassOptionsOptions;
  sourcePath?: string;
  outputPath?: string;
  fileSuffix?: string;
}

/** Add an sass processing task to the Grunt configuration
 *
 * @param gruntConfig - Grunt configuration to add the task to
 *
 * @param targetName - Name of the target for the image minification task.
 *
 * @param sassOptions - Options for the sass task configuration.
 *
 * @returns
 * List of tasks added to the grunt configuration
 */
export const handle = (
  gruntConfig: util.GruntConfig,
  targetName: string,
  sassOptions: SassOptions,
): HandlerFunctionResult => {
  const handledFiles = [
    ...handledExtensions.map((ext) => `**/*${ext}`),
    ...handledExtensions.map((ext) => `!**/_*${ext}`),
    ...handledExtensions.map((ext) => `!**/*.inc${ext}`),
  ];
  const sassTask = {
    options: {...sassOptions.options},
    files: [
      {
        cwd: sassOptions.sourcePath ?? join("webres", targetName),
        dest: sassOptions.outputPath ?? join("dist", targetName),
        expand: true,
        ext: sassOptions.fileSuffix ?? ".css",
        src: handledFiles,
      },
    ],
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sassTask.options.implementation ??= require("sass") as Record<
      string,
      unknown
    >;
  const requiredTasks = [util.insertTask(gruntConfig, "sass", targetName, sassTask)];
  const watchTasks = [
    {
      filesToWatch: [...handledExtensions.map((ext) => `**/*${ext}`)],
      taskToRun: requiredTasks[0],
    },
  ];
  return {handledFiles, requiredTasks, watchTasks};
};
