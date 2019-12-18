import {deepSet, BaseOptions, GenericConfigObject} from "./util";
import {
  handle as handlePug,
  PugOptions,
} from "./reactapp/pug";
import {
  handle as handleImage,
  ImageOptions,
} from "./reactapp/image";
import {
  handle as handleWebpack,
  WebpackOptions,
} from "./reactapp/webpack";
import {
  handle as handleSass,
  SassOptions,
} from "./reactapp/sass";
import {
  handle as handleCopy,
  CopyOptions,
} from "./reactapp/copy";
import {GruntConfig, insertTask} from "./reactapp/util";

export enum HandlerType {
  PUG = "pug",
  IMAGE = "image",
  WEBPACK = "webpack",
  SASS = "sass",
  COPY = "copy",
}

export interface ReactAppOptions {
  [HandlerType.PUG]?: PugOptions;
  [HandlerType.IMAGE]?: ImageOptions;
  [HandlerType.WEBPACK]?: WebpackOptions;
  [HandlerType.SASS]?: SassOptions;
  [HandlerType.COPY]?: CopyOptions;
  watch?: boolean;
}

export interface WatchTaskDef {
  filesToWatch: Array<string>;
  taskToRun: string;
}

export interface HandlerFunctionResult {
  requiredTasks: Array<string>;
  handledFiles: Array<string>;
  watchTasks: Array<WatchTaskDef>;
}

export type HandlerFunction = (
  gruntConfig: GruntConfig,
  targetName: string,
  options: BaseOptions
) => HandlerFunctionResult;

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
 * @param gruntConfig
 * The Grunt configuration with other tasks, before it is passed to
 * grunt.initConfig()
 * 
 * @param [targetName]
 * Name for the various targets added to Grunt. Defaults to "reactApp"
 * 
 * @param [options]
 * Options to control the extra tasks
 * 
 * @param [options.pug]
 * Options for the pug task. See pug.js for details.
 * 
 * @param [options.pug.disabled]
 * Do not generate pug task
 * 
 * @param [options.image]
 * Options for the image task. See image.js for details.
 * 
 * @param [options.image.disabled]
 * Do not generate image task
 * 
 * @param [options.webpack]
 * Options for the webpack task. See webpack.js for details.
 * 
 * @param [options.webpack.disabled]
 * Do not generate webpack task
 * 
 * @param [options.sass]
 * Options for the sass task. See sass.js for details.
 * 
 * @param [options.sass.disabled]
 * Do not generate sass task
 * 
 * @param [options.copy]
 * Optiosn for the copy task. See copy.js for details.
 * 
 * @param [options.copy.disabled]
 * Do not generate copy task
 * 
 * @return
 * List of tasks to build the application
 */
export const reactApp = (
  gruntConfig: GruntConfig,
  targetName = "reactApp",
  options?: ReactAppOptions
): Array<string> => {
  const handlers: Record<string, HandlerFunction> = {
    [HandlerType.PUG]: handlePug,
    [HandlerType.IMAGE]: handleImage,
    [HandlerType.WEBPACK]: handleWebpack,
    [HandlerType.SASS]: handleSass,
  };
  const tasksResults = (Object.keys(handlers) as Array<HandlerType>)
    .reduce<Array<HandlerFunctionResult>>(
      (acc, cur) => acc.concat(
        (options && options[cur] && (options[cur] || {}).disabled)
          ? []
          : handlers[cur](
            gruntConfig,
            targetName,
            options && options[cur] || {}
          )),
      []
    );
  const splitResult = tasksResults.reduce(
    (acc, cur) => {
      acc.requiredTasks = acc.requiredTasks.concat(cur.requiredTasks);
      acc.handledFiles = acc.handledFiles.concat(cur.handledFiles);
      acc.watchTasks = acc.watchTasks.concat(cur.watchTasks);
      return acc;
    },
    {
      requiredTasks: [],
      handledFiles: [],
      watchTasks: [],
    }
  );
  // Copy remaining files
  const copyOptions = options && options[HandlerType.COPY] || {};
  copyOptions.skipFiles = splitResult.handledFiles;
  const copyTask = handleCopy(
    gruntConfig,
    targetName,
    options && options[HandlerType.COPY] || {}
  );
  splitResult.requiredTasks = splitResult.requiredTasks.concat(copyTask.requiredTasks);
  splitResult.watchTasks = splitResult.watchTasks.concat(copyTask.watchTasks);
  // Add grunt-contrib-watch task
  if (splitResult.watchTasks.length > 0) {
    insertTask(
      gruntConfig,
      "watch",
      "options",
      {
        livereload: true,
      }
    );
  }
  splitResult.watchTasks.forEach(watchTask => {
    insertTask(
      gruntConfig,
      "watch",
      watchTask.taskToRun.split(":").join("_"),
      {
        options: {
          livereload: true,
        },
        files: watchTask.filesToWatch.reduce<Array<string>>(
          (acc, cur) => {
            if (cur.startsWith("!")) {
              acc.push(`!webres/${cur.substr(1)}`);
            } else {
              acc.push(`webres/${cur}`);
            }
            return acc;
          },
          []
        ),
        tasks: [watchTask.taskToRun],
      }
    );
  });
  return splitResult.requiredTasks;
};

export interface HelperOptions {
  production?: boolean;
}

/** Helper for common options shared across multiple tasks.
 * 
 * @param [helperOptions]
 * Options shared by multiple tasks
 * 
 * @param [helperOptions.production]
 * Make a production build.
 * - set outputStyle and sourceMap for sass
 * - set pretty for pug
 * - add a "productionBuild" property in pug data
 * - set mode for webpack
 * 
 * @param [options]
 * Initial options for reactApp().
 * This object will be copied and required parameters will be added by this
 * function.
 * Modified object are also duplicated, so no original data is modified.
 * 
 * @return
 * A configuration object for reactApp().
 */
export const reactAppOptionsHelper = (
  helperOptions: HelperOptions,
  options: ReactAppOptions
): ReactAppOptions => {
  let result = deepSet((options as GenericConfigObject), "sass.options.outputStyle",
    helperOptions.production ? "compressed" : "nested");
  result = deepSet(result, "sass.options.sourceMap",
    helperOptions.production ? false : true);
  result = deepSet(result, "pug.options.pretty",
    helperOptions.production ? false : true);
  result = deepSet(result, "pug.options.data.productionBuild",
    helperOptions.production ? "true" : "false");
  result = deepSet(result, "webpack.mode",
    helperOptions.production ? "production" : "development");
  return result;
};
