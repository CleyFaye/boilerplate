import {join} from "path";

import {type HandlerFunctionResult} from "../reactapp.js";
import {type BaseOptions} from "../util.js";

import * as util from "./util.js";

export interface ImageOptions extends BaseOptions {
  options?: Record<string, unknown>;
  sourcePath?: string;
  outputPath?: string;
}

/** File extensions handled by this task */
const handledExtensions = [".jpg", ".png", ".svg"];

/** Add an image minification task to the Grunt configuration
 *
 * @param gruntConfig - Grunt configuration to add the task to
 *
 * @param targetName - Name of the target for the image minification task.
 *
 * @param imageOptions - Options for the image task configuration.
 *
 * @returns
 * List of tasks added to the grunt configuration
 */
export const handle = (
  gruntConfig: util.GruntConfig,
  targetName: string,
  imageOptions: ImageOptions,
): HandlerFunctionResult => {
  const handledFiles = handledExtensions.map((ext) => `**/*${ext}`);
  // TODO use @cley_faye/imagemin-lite once it exists
  const newImageTask = {
    options: imageOptions.options,
    files: [
      {
        cwd: imageOptions.sourcePath ?? join("webres", targetName),
        dest: imageOptions.outputPath ?? join("dist", targetName),
        expand: true,
        src: handledFiles,
      },
    ],
  };
  const requiredTasks = [util.insertTask(gruntConfig, "copy", `${targetName}_image`, newImageTask)];
  const watchTasks = [{filesToWatch: handledFiles, taskToRun: requiredTasks[0]}];
  return {handledFiles, requiredTasks, watchTasks};
};
