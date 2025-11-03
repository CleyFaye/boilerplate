import {join} from "path";

import {type HandlerFunctionResult} from "../reactapp.js";
import {type BaseOptions} from "../util.js";

import * as util from "./util.js";

export type DynamicDataFunc = () => Promise<Record<string, unknown>>;

export interface PugOptions extends BaseOptions {
  options?: Record<string, unknown>;
  sourcePath?: string;
  outputPath?: string;
  fileSuffix?: string;
  dynamicData?: DynamicDataFunc;
}

/** File extensions handled by this task */
const handledExtensions = [".pug"];

const createDynamicTask = (
  gruntConfig: util.GruntConfig,
  targetName: string,
  pugOptions: PugOptions,
  pugTask: {options?: Record<string, unknown>},
  requiredTasks: Array<string>,
): void => {
  if (!pugOptions.dynamicData) {
    return;
  }
  requiredTasks.splice(
    0,
    0,
    util.insertDynamicTask(gruntConfig, "pugDynamicData", targetName, () => {
      if (!pugOptions.dynamicData) {
        return Promise.reject(new Error("Missing expected function"));
      }
      // eslint-disable-next-line promise/prefer-await-to-then
      return pugOptions.dynamicData().then((extraData) => {
        // eslint-disable-next-line promise/always-return
        pugTask.options ??= {};
        pugTask.options.data = {
          ...(pugTask.options.data as Record<string, unknown>),
          ...extraData,
        };
      });
    }),
  );
};

/** Add the pug task for a reactApp recipe.
 *
 * @param gruntConfig - The Grunt configuration to add tasks to.
 *
 * @param targetName - Name of the target for the pug task.
 *
 * @param pugOptions - Configuration for the pug task.
 *
 * @returns
 * The name of the tasks added to the gruntConfig object.
 */
export const handle = (
  gruntConfig: util.GruntConfig,
  targetName: string,
  pugOptions: PugOptions,
): HandlerFunctionResult => {
  const handledFiles = handledExtensions.map((ext) => `**/*${ext}`);
  const newPugTask = {
    options: pugOptions.options,
    files: [
      {
        cwd: pugOptions.sourcePath ?? join("webres", targetName),
        dest: pugOptions.outputPath ?? join("dist", targetName),
        expand: true,
        ext: pugOptions.fileSuffix ?? ".html",
        src: handledFiles,
      },
    ],
  };
  const requiredTasks = [util.insertTask(gruntConfig, "pug", targetName, newPugTask)];
  createDynamicTask(gruntConfig, targetName, pugOptions, newPugTask, requiredTasks);
  const watchTasks = [{filesToWatch: handledFiles, taskToRun: requiredTasks}];
  return {handledFiles, requiredTasks, watchTasks};
};
