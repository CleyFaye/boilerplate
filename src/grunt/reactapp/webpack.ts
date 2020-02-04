import {
  join, resolve,
} from "path";
import {
  insertTask, GruntConfig,
} from "./util";
import {BaseOptions} from "../util";
import {
  HandlerFunctionResult, WatchTaskDef,
} from "../reactapp";

export interface WebpackLoadersOptions {
  development?: boolean;
  babel?: {
    corejs: number;
    targets?: string;
  };
}

const defaultCoreJS = 3;

/** Build the default webpack loaders list.
 *
 * Uses babel and eslint. Some options can be customized here.
 *
 * @param [options]
 * @param [options.development]
 * true for development-friendly options, false for production options
 *
 * @param [options.babel]
 * @param [options.babel.corejs]
 * Version of core-js to use (default to 3)
 *
 * @param [options.babel.targets]
 * Browser targets (default to "last 1 version, > 2%, not dead")
 */
export const webpackLoadersDefault = (
  options: WebpackLoadersOptions,
): Array<object> => [
  {
    test: /.js$/u,
    exclude: /node_modules/u,
    use: {
      loader: "babel-loader",
      options: {
        cacheDirectory: true,
        presets: [
          [
            "@babel/preset-env",
            {
              targets: (options && options.babel && options.babel.targets)
                || "last 1 version, > 2%, not dead",
              useBuiltIns: "usage",
              corejs: (options && options.babel && options.babel.corejs)
                || defaultCoreJS,
              modules: false,
            },
          ],
          [
            "@babel/preset-react",
            {development: options && options.development},
          ],
        ],
        plugins: [
          [
            "transform-define",
            {
              "process.env.BUILD_TYPE": options && options.development
                ? "development"
                : "production",
            },
          ],
        ],
      },
    },
  },
  {
    test: /\.js$/u,
    // eslint-disable-next-line prefer-named-capture-group
    exclude: /node_modules|(\/|\\)build(\/|\\)/u,
    use: {
      loader: "eslint-loader",
      options: {cache: true},
    },
  },
];

export interface WebpackOptions extends BaseOptions {
  mode?: "development" | "production" | "none";
  options?: object;
  entry?: Record<string, string>;
  externals?: Record<string, string>;
  output?: {
    path?: string;
    filename?: string;
  };
  loaders?: Array<object>;
  plugins?: Array<object>;
}

const computeWebpackOutput = (
  webpackOptions: WebpackOptions,
  targetName: string,
): {
  path?: string;
  filename?: string;
} => webpackOptions.output || {
  path: resolve("dist", targetName, "js"),
  filename: "[name].js",
};

const getHandledFiles = (
  webpackEntry: Record<string, string>,
): Array<string> => Object.keys(webpackEntry).reduce<Array<string>>(
  (acc, cur) => {
    if (webpackEntry[cur].startsWith("webres")) {
      acc.push(webpackEntry[cur].substr("webres/".length));
    }
    webpackEntry[cur] = resolve(webpackEntry[cur]);
    return acc;
  },
  [],
);

const getOutputToWatch = (
  webpackOptions: WebpackOptions,
  targetName: string,
): string | null => webpackOptions.output
  ? null
  : join("dist", targetName, "js", `${targetName}.js`);

const getWatchTasks = (
  webpackOptions: WebpackOptions,
  targetName: string,
): Array<WatchTaskDef> => {
  const outputToWatch = getOutputToWatch(webpackOptions, targetName);
  if (outputToWatch) {
    return [
      {
        filesToWatch: [outputToWatch],
        fromRoot: true,
      },
    ];
  }
  return [];
};

const registerTasks = (
  gruntConfig: GruntConfig,
  targetName: string,
  webpackConfig: object,
): Array<string> => {
  insertTask(
    gruntConfig,
    "webpack",
    `${targetName}_watch`,
    {
      ...webpackConfig,
      watch: true,
    },
  );
  return [
    insertTask(
      gruntConfig,
      "webpack",
      targetName,
      webpackConfig,
    ),
  ];
};

/** Add a webpack task for the reactApp recipe
 *
 * @param gruntConfig
 * Grunt configuration to add the task to
 *
 * @param targetName
 * Name of the target for the image minification task.
 *
 * @param webpackOptions
 * Options for the webpack task configuration.
 *
 * @param [webpackOptions.options]
 * Options for webpack
 *
 * @param [webpackOptions.entry]
 * List of entrypoints.
 * Defaults to {targetName: "webres/<targetName>/js/loader.js"}
 *
 * @param [webpackOptions.externals]
 * List of external libraries.
 * Defaults to {}.
 *
 * @param [webpackOptions.output]
 * Configure webpack output location and name.
 * Defaults to {path: "dist/<targetName>/js", filename: "[name].js"}
 *
 * @param [webpackOptions.output.path]
 * Path to put the compiled files into.
 * It is possible to pass a completely different object as webpackOptions.output
 * than expected, it will be handed to webpack as-is.
 *
 * @param [webpackOptions.output.filename]
 * Template for output filename.
 * It is possible to pass a completely different object as webpackOptions.output
 * than expected, it will be handed to webpack as-is.
 *
 * @param [webpackOptions.loaders]
 * Configuration for webpack loaders. See webpack doc about module.rules.
 * Defaults to using babel with React configuration and eslint.
 * To customize the default behavior build an object with
 * webpackLoadersDefault().
 *
 * @param [webpackOptions.plugins]
 * Configuration for webpack plugins. See webpack doc about plugins.
 *
 * @param [webpackOptions.mode]
 * Build mode. "development", "production" or "none".
 * Defaults to "development"
 *
 * @return
 * List of tasks added.
 * This function add "webpack:<targetName>".
 */
export const handle = (
  gruntConfig: GruntConfig,
  targetName: string,
  webpackOptions: WebpackOptions,
): HandlerFunctionResult => {
  const webpackEntry = webpackOptions.entry
    || {[targetName]: join("webres", targetName, "js", "loader.js")};
  const handledFiles = getHandledFiles(webpackEntry);
  const webpackOutput = computeWebpackOutput(webpackOptions, targetName);
  const webpackLoaders = webpackOptions.loaders
    || webpackLoadersDefault(
      {development: webpackOptions.mode === "development"},
    );
  const webpackConfig = {
    mode: webpackOptions.mode,
    devtool: webpackOptions.mode === "development" ? "eval-source-map" : false,
    entry: webpackEntry,
    output: webpackOutput,
    externals: webpackOptions.externals,
    module: {rules: webpackLoaders},
    plugins: webpackOptions.plugins,
  };
  // Special case: I'm not sure I can move options in the task-specific part of
  // the configuration, so I add it at the toplevel of the "webpack" task.
  if (webpackOptions.options) {
    insertTask(gruntConfig, "webpack", "options", webpackOptions.options);
  }
  const requiredTasks = registerTasks(gruntConfig, targetName, webpackConfig);
  const watchTasks = getWatchTasks(webpackOptions, targetName);
  return {
    requiredTasks,
    handledFiles,
    watchTasks,
  };
};
