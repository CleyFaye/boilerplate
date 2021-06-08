import {join} from "path";
import {insertTask, GruntConfig} from "./util.js";
import {BaseOptions} from "../util.js";
import {HandlerFunctionResult} from "../reactapp.js";

/** File extensions handled by this task */
const handledExtensions = [
  ".scss",
  ".sass",
];

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
 * @param gruntConfig
 * Grunt configuration to add the task to
 *
 * @param targetName
 * Name of the target for the image minification task.
 *
 * @param sassOptions
 * Options for the sass task configuration.
 *
 * @param sassOptions.options
 * Options to pass to grunt-sass.
 *
 * @param [sassOptions.options.implementation]
 * Implementation to use. Defaults to require("sass").
 *
 * @param [sassOptions.sourcePath]
 * Path where the pug templates can be found. Subdirectories will be searched.
 * Default to "webres/<targetName>"
 *
 * @param [sassOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 *
 * @param [sassOptions.fileSuffix]
 * Output files suffix. Defaults to ".css"
 *
 * @return
 * List of tasks added to the grunt configuration
 */
export const handle = (
  gruntConfig: GruntConfig,
  targetName: string,
  sassOptions: SassOptions,
): HandlerFunctionResult => {
  const handledFiles = [
    ...handledExtensions.map(ext => `**/*${ext}`),
    ...handledExtensions.map(ext => `!**/*.inc${ext}`),
  ];
  const sassTask = {
    options: {...sassOptions.options},
    files: [
      {
        expand: true,
        cwd: sassOptions.sourcePath ?? join("webres", targetName),
        src: handledFiles,
        dest: sassOptions.outputPath ?? join("dist", targetName),
        ext: sassOptions.fileSuffix ?? ".css",
      },
    ],
  };
  if ((sassTask.options as SassOptionsOptions).implementation === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require, @typescript-eslint/no-var-requires
    (sassTask.options as SassOptionsOptions).implementation = require(
      "sass",
    ) as Record<string, unknown>;
  }
  const requiredTasks = [insertTask(gruntConfig, "sass", targetName, sassTask)];
  const watchTasks = [
    {
      filesToWatch: [...handledExtensions.map(ext => `**/*${ext}`)],
      taskToRun: requiredTasks[0],
    },
  ];
  return {
    requiredTasks,
    handledFiles,
    watchTasks,
  };
};
