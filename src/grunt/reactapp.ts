import * as reactAppCopy from "./reactapp/copy.js";
import * as reactAppImage from "./reactapp/image.js";
import * as reactAppPug from "./reactapp/pug.js";
import * as reactAppSass from "./reactapp/sass.js";
import * as reactAppUtil from "./reactapp/util.js";
import * as reactAppWebpack from "./reactapp/webpack.js";
import * as util from "./util.js";

export enum HandlerType {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PUG = "pug",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  IMAGE = "image",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  WEBPACK = "webpack",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  SASS = "sass",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  COPY = "copy",
}

export interface ReactAppOptions {
  [HandlerType.PUG]?: reactAppPug.PugOptions;
  [HandlerType.IMAGE]?: reactAppImage.ImageOptions;
  [HandlerType.WEBPACK]?: reactAppWebpack.WebpackOptions;
  [HandlerType.SASS]?: reactAppSass.SassOptions;
  [HandlerType.COPY]?: reactAppCopy.CopyOptions;
  watch?: number | boolean;
}

export interface WatchTaskDef {
  filesToWatch: Array<string>;
  taskToRun?: string | Array<string>;
  fromRoot?: boolean;
}

export interface HandlerFunctionResult {
  requiredTasks: Array<string>;
  handledFiles: Array<string>;
  watchTasks: Array<WatchTaskDef>;
}

export type HandlerFunction = (
  gruntConfig: reactAppUtil.GruntConfig,
  targetName: string,
  options: util.BaseOptions,
) => HandlerFunctionResult;

const gatherTasks = (
  handlers: Record<string, HandlerFunction>,
  gruntConfig: reactAppUtil.GruntConfig,
  targetName: string,
  options?: ReactAppOptions,
): Array<HandlerFunctionResult> =>
  (Object.keys(handlers) as Array<HandlerType>).reduce<Array<HandlerFunctionResult>>(
    (acc, cur) =>
      acc.concat(
        options?.[cur]?.disabled
          ? []
          : handlers[cur](gruntConfig, targetName, options?.[cur] ?? {}),
      ),
    [],
  );

const mergeResults = (tasksResults: Array<HandlerFunctionResult>): HandlerFunctionResult =>
  tasksResults.reduce(
    (acc, cur) => {
      acc.requiredTasks = acc.requiredTasks.concat(cur.requiredTasks);
      acc.handledFiles = acc.handledFiles.concat(cur.handledFiles);
      acc.watchTasks = acc.watchTasks.concat(cur.watchTasks);
      return acc;
    },
    {handledFiles: [], requiredTasks: [], watchTasks: []},
  );

const createCopyTask = (
  gruntConfig: reactAppUtil.GruntConfig,
  targetName: string,
  mergedResults: HandlerFunctionResult,
  options?: ReactAppOptions,
): void => {
  const copyOptions = options?.[HandlerType.COPY] ?? {};
  copyOptions.skipFiles = mergedResults.handledFiles;
  const copyTask = reactAppCopy.handle(gruntConfig, targetName, copyOptions);
  mergedResults.requiredTasks = mergedResults.requiredTasks.concat(copyTask.requiredTasks);
  mergedResults.watchTasks = mergedResults.watchTasks.concat(copyTask.watchTasks);
};

const getWatcherOptions = (watchMode?: boolean | number): Record<string, unknown> => {
  if (watchMode === undefined) {
    return {livereload: true};
  }
  return {livereload: watchMode};
};

let unnamedIndex = 0;

const getWatchTaskName = (watchTask: WatchTaskDef): string => {
  if (!watchTask.taskToRun) {
    return `unnamed${unnamedIndex++}`;
  }
  if (Array.isArray(watchTask.taskToRun)) {
    return watchTask.taskToRun.join("_").split(":").join("_");
  }
  return watchTask.taskToRun.split(":").join("_");
};

const getEffectiveTasksToRun = (watchTask: WatchTaskDef): Array<string> | undefined => {
  if (!watchTask.taskToRun) {
    return;
  }
  if (Array.isArray(watchTask.taskToRun)) {
    return watchTask.taskToRun;
  }
  return [watchTask.taskToRun];
};

const createWatchTasks = (
  gruntConfig: reactAppUtil.GruntConfig,
  mergedResults: HandlerFunctionResult,
  watchMode?: boolean | number,
): void => {
  if (watchMode === false) {
    return;
  }
  mergedResults.watchTasks.forEach((watchTask) => {
    reactAppUtil.insertTask(gruntConfig, "watch", getWatchTaskName(watchTask), {
      files: watchTask.filesToWatch.reduce<Array<string>>((acc, cur) => {
        const prefix = watchTask.fromRoot ? "" : "webres/";
        if (cur.startsWith("!")) {
          acc.push(`!${prefix}${cur.substring(1)}`);
        } else {
          acc.push(`${prefix}${cur}`);
        }
        return acc;
      }, []),
      options: getWatcherOptions(watchMode),
      tasks: getEffectiveTasksToRun(watchTask),
    });
  });
};

/** Insert necessary build step for a React/Web app.
 *
 * This function will add the following Grunt tasks:
 * - "pug:<targetName>": transform pug templates
 * - "imagemin:<targetName>": compress images
 * - "webpack:<targetName>": bundle JavaScript
 * - "webpack:<targetName>:dev": start the webpack dev server
 * - "sass:<targetName>": compile sass/scss files
 * - "copy:<targetName>": copy files not handled in other tasks
 *
 * @param gruntConfig - The Grunt configuration with other tasks, before it is passed to
 * grunt.initConfig()
 *
 * @param targetName - Name for the various targets added to Grunt. Defaults to "reactApp"
 *
 * @param options - Options to control the extra tasks
 *
 * @returns
 * List of tasks to build the application
 */
export const reactApp = (
  gruntConfig: reactAppUtil.GruntConfig,
  targetName = "reactApp",
  options?: ReactAppOptions,
): Array<string> => {
  const handlers: Record<string, HandlerFunction> = {
    [HandlerType.PUG]: reactAppPug.handle,
    [HandlerType.IMAGE]: reactAppImage.handle,
    [HandlerType.WEBPACK]: reactAppWebpack.handle,
    [HandlerType.SASS]: reactAppSass.handle,
  };
  const tasksResults = gatherTasks(handlers, gruntConfig, targetName, options);
  const mergedResults = mergeResults(tasksResults);
  if (!options?.copy?.disabled) createCopyTask(gruntConfig, targetName, mergedResults, options);
  // Add grunt-contrib-watch task
  createWatchTasks(gruntConfig, mergedResults, options?.watch);
  return mergedResults.requiredTasks;
};

export interface HelperOptions {
  production?: boolean;
  watch?: boolean | number;
}

/** Helper for common options shared across multiple tasks.
 *
 * @param helperOptions - Options shared by multiple tasks
 *
 * @param options - Initial options for reactApp().
 * This object will be copied and required parameters will be added by this
 * function.
 * Modified object are also duplicated, so no original data is modified.
 *
 * @returns
 * A configuration object for reactApp().
 */
export const reactAppOptionsHelper = (
  helperOptions: HelperOptions,
  options: ReactAppOptions,
): ReactAppOptions => {
  let result = util.deepSet(
    options as util.GenericConfigObject,
    "sass.options.outputStyle",
    helperOptions.production ? "compressed" : "expanded",
  );
  result = util.deepSet(result, "sass.options.sourceMap", !helperOptions.production);
  result = util.deepSet(result, "pug.options.pretty", !helperOptions.production);
  result = util.deepSet(
    result,
    "pug.options.data.productionBuild",
    Boolean(helperOptions.production),
  );
  result = util.deepSet(
    result,
    "webpack.mode",
    helperOptions.production ? "production" : "development",
  );
  if (helperOptions.watch !== undefined) {
    result.watch = helperOptions.watch;
  }
  return result;
};

/**
 * Register optional dynamic tasks generated in grunt config.
 *
 * Must be called before any other `grunt.registerTask()`
 */
export const reactAppDynamicTasks = (
  grunt: grunt.task.CommonTaskModule,
  gruntConfig: reactAppUtil.GruntConfig,
): void => {
  if (!(reactAppUtil.dynamicKey in gruntConfig)) {
    return;
  }
  Object.keys(gruntConfig[reactAppUtil.dynamicKey]).forEach((dynamicTaskName) => {
    grunt.registerTask(
      dynamicTaskName,
      gruntConfig[reactAppUtil.dynamicKey][dynamicTaskName] as () => void,
    );
  });
};
