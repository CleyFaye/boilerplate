import {join} from "path";
import {BaseOptions} from "../util.js";
import {HandlerFunctionResult} from "../reactapp.js";
import {insertTask, GruntConfig} from "./util.js";

export interface ImageOptions extends BaseOptions {
  options?: Record<string, unknown>;
  sourcePath?: string;
  outputPath?: string;
}

/** File extensions handled by this task */
const handledExtensions = [
  ".jpg",
  ".png",
  ".svg",
];

/** Add an image minification task to the Grunt configuration
 *
 * @param gruntConfig
 * Grunt configuration to add the task to
 *
 * @param targetName
 * Name of the target for the image minification task.
 *
 * @param imageOptions
 * Options for the image task configuration.
 *
 * @param [imageOptions.options]
 * Options to pass to @cley_faye/imagemin-lite.
 *
 * @param [imageOptions.sourcePath]
 * Path where the source images can be found. Subdirectories will be searched.
 * Default to "webres/<targetName>"
 *
 * @param [imageOptions.outputPath]
 * Path to put the output files into. The source directory tree will be
 * preserved.
 * Defaults to "dist/<targetName>"
 *
 * @return
 * List of tasks added to the grunt configuration
 */
export const handle = (
  gruntConfig: GruntConfig,
  targetName: string,
  imageOptions: ImageOptions,
): HandlerFunctionResult => {
  const handledFiles = handledExtensions.map(ext => `**/*${ext}`);
  // TODO use @cley_faye/imagemin-lite once it exists
  const newImageTask = {
    options: imageOptions.options,
    files: [
      {
        expand: true,
        cwd: imageOptions.sourcePath ?? join("webres", targetName),
        src: handledFiles,
        dest: imageOptions.outputPath ?? join("dist", targetName),
      },
    ],
  };
  const requiredTasks = [
    insertTask(
      gruntConfig,
      "copy",
      `${targetName}_image`,
      newImageTask,
    ),
  ];
  const watchTasks = [
    {
      filesToWatch: handledFiles,
      taskToRun: requiredTasks[0],
    },
  ];
  return {
    requiredTasks,
    handledFiles,
    watchTasks,
  };
};
