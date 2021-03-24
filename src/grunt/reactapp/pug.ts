import {join} from "path";
import {insertTask, GruntConfig, insertDynamicTask} from "./util";
import {BaseOptions} from "../util";
import {HandlerFunctionResult} from "../reactapp";

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
  gruntConfig: GruntConfig,
  targetName: string,
  pugOptions: PugOptions,
  pugTask: {options?: Record<string, unknown>},
  requiredTasks: Array<string>,
): void => {
  if (!pugOptions.dynamicData) {
    return;
  }
  requiredTasks.splice(0, 0, insertDynamicTask(
    gruntConfig,
    "pugDynamicData",
    targetName,
    () => {
      if (!pugOptions.dynamicData) {
        return Promise.reject(new Error("Missing expected function"));
      }
      return pugOptions.dynamicData()
        .then(extraData => {
          if (!pugTask.options) {
            pugTask.options = {};
          }
          pugTask.options.data = {
            ...(pugTask.options.data as Record<string, unknown>),
            ...extraData,
          };
        });
    },
  ));
};

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
 * @param [pugOptions.dynamicData]
 * A function that returns a promise with data to add to `options.data`
 *
 * @return
 * The name of the tasks added to the gruntConfig object.
 */
export const handle = (
  gruntConfig: GruntConfig,
  targetName: string,
  pugOptions: PugOptions,
): HandlerFunctionResult => {
  const handledFiles = handledExtensions.map(ext => `**/*${ext}`);
  const newPugTask = {
    options: pugOptions.options,
    files: [
      {
        expand: true,
        cwd: pugOptions.sourcePath ?? join("webres", targetName),
        src: handledFiles,
        dest: pugOptions.outputPath ?? join("dist", targetName),
        ext: pugOptions.fileSuffix ?? ".html",
      },
    ],
  };
  const requiredTasks = [
    insertTask(
      gruntConfig,
      "pug",
      targetName,
      newPugTask,
    ),
  ];
  createDynamicTask(
    gruntConfig,
    targetName,
    pugOptions,
    newPugTask,
    requiredTasks,
  );
  const watchTasks = [
    {
      filesToWatch: handledFiles,
      taskToRun: requiredTasks,
    },
  ];
  return {
    requiredTasks,
    handledFiles,
    watchTasks,
  };
};
