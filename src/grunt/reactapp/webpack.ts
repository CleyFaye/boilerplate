import {join, resolve} from "path";
import {existsSync} from "node:fs";
import ESLintPlugin from "eslint-webpack-plugin";
import {BundleAnalyzerPlugin} from "webpack-bundle-analyzer";
import {ResolveOptions} from "webpack";
import {BaseOptions} from "../util.js";
import {HandlerFunctionResult, WatchTaskDef} from "../reactapp.js";
import {insertTask, GruntConfig} from "./util.js";

export interface WebpackLoadersOptions {
  development?: boolean;
  defines?: Record<string, string>;
  babel?: {
    corejs?: number;
    targets?: string;
    plugins?: Array<Record<string, unknown>>;
  };
  typescript?: boolean;
}

const defaultCoreJS = 3;

const eslintPlugin = () => new ESLintPlugin({cache: true});

const defaultLoadersDefine = (options: WebpackLoadersOptions) => [
  "transform-define",
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "process.env.BUILD_TYPE": options.development
      ? "development"
      : "production",
    ...options.defines,
  },
];

const defaultLoadersPresetEnv = (options: WebpackLoadersOptions) => [
  "@babel/preset-env",
  {
    targets: (options.babel?.targets) ?? "> 2% and not dead, last 2 safari version, last 2 firefox version, last 2 chrome version, last 2 edge version, Firefox ESR",
    useBuiltIns: "usage",
    corejs: (options.babel?.corejs) ?? defaultCoreJS,
    modules: false,
  },
];

const defaultLoadersReact = (options: WebpackLoadersOptions) => [
  "@babel/preset-react",
  {development: options.development},
];

/** Build the default webpack loaders list.
 *
 * Uses babel and eslint. Some options can be customized here.
 *
 * @param [options]
 * @param [options.development]
 * true for development-friendly options, false for production options
 *
 * @param [options.defines]
 * List of defines to set using Babel transform-define
 *
 * @param [options.babel]
 * @param [options.babel.corejs]
 * Version of core-js to use (default to 3)
 *
 * @param [options.babel.targets]
 * Browser targets (default to "> 2% and not dead, last 2 safari version, last 2 firefox version,
 * last 2 chrome version, last 2 edge version, Firefox ESR")
 *
 * @param [options.babel.plugins]
 * Plugins to add to babel
 *
 * @param [options.typescript]
 * Add support for importing .ts and .tsx files
 */
export const webpackLoadersDefault = (
  options: WebpackLoadersOptions,
): Array<Record<string, unknown>> => {
  const allFilesCheck = options.typescript
    ? /.(?:js|ts|tsx)$/u
    : /.js$/u;
  const res: Array<Record<string, unknown>> = [
    {
      test: allFilesCheck,
      exclude: /node_modules/u,
      use: {
        loader: "babel-loader",
        options: {
          cacheDirectory: true,
          presets: [
            defaultLoadersPresetEnv(options),
            defaultLoadersReact(options),
          ],
          plugins: [
            defaultLoadersDefine(options),
            ...(options.babel?.plugins ?? []),
          ],
        },
      },
    },
  ];
  if (options.typescript) {
    const alternativeConfig = "tsconfig-tsloader.json";
    const tsLoader = existsSync(alternativeConfig)
      ? [{
        loader: "ts-loader",
        options: {configFile: alternativeConfig},
      }]
      : "ts-loader";
    res.push({
      test: /.(?:ts|tsx)$/u,
      use: tsLoader,
      exclude: /node_modules/u,
    });
  }
  return res;
};

export interface WebpackOptions extends BaseOptions {
  mode?: "development" | "production" | "none";
  options?: Record<string, unknown>;
  entry?: Record<string, string>;
  externals?: Record<string, string>;
  output?: {
    path?: string;
    filename?: string;
  };
  loaders?: Array<Record<string, unknown>>;
  plugins?: Array<Record<string, unknown>>;
  babelPlugins?: Array<Record<string, unknown>>;
  defines?: Record<string, string>;
  resolve?: ResolveOptions;
  generateReport?: boolean;
  typescript?: boolean;
}

const computeWebpackOutput = (
  webpackOptions: WebpackOptions,
  targetName: string,
): {
  path?: string;
  filename?: string;
  chunkFilename?: string;
} => webpackOptions.output ?? {
  path: resolve("dist", targetName, "js"),
  filename: "[name].js",
  chunkFilename: "[name]-[fullhash].js",
};

const lastNamePosition = 2;

const getHandledFiles = (
  webpackEntry: Record<string, string>,
): Array<string> => Object.keys(webpackEntry).reduce<Array<string>>(
  (acc, cur) => {
    if (webpackEntry[cur].startsWith("webres")) {
      const split = webpackEntry[cur].split("/");
      acc.push(split.slice(lastNamePosition).join("/"));
    }
    webpackEntry[cur] = resolve(webpackEntry[cur]);
    return acc;
  },
  [],
);

const getOutputToWatch = (
  webpackOptions: WebpackOptions,
  targetName: string,
): Array<string> | null => {
  if (webpackOptions.output) {
    return null;
  }
  // Watch all output directory, since webpack generate chunks
  return [join("dist", targetName, "js", "*.js")];
};

const getWatchTasks = (
  webpackOptions: WebpackOptions,
  targetName: string,
): Array<WatchTaskDef> => {
  const outputToWatch = getOutputToWatch(webpackOptions, targetName);
  if (outputToWatch) {
    return [
      {
        filesToWatch: outputToWatch,
        fromRoot: true,
      },
    ];
  }
  return [];
};

const registerTasks = (
  gruntConfig: GruntConfig,
  targetName: string,
  webpackConfig: Record<string, unknown>,
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

const computeWebpackResolve = (
  webpackOptions: WebpackOptions,
): Record<string, unknown> => {
  const res = {...webpackOptions.resolve};
  if (webpackOptions.typescript) {
    if (res.extensionAlias === undefined) {
      res.extensionAlias = {};
    }
    res.extensionAlias[".js"] = [".ts", ".tsx", ".js", ".jsx"];
    res.extensionAlias[".mjs"] = [".mts", ".mtsx", ".mjs", ".mjsx"];
  }
  return res;
};

const getWebpackPlugins = (webpackOptions: WebpackOptions): Array<unknown> => {
  const plugins: Array<unknown> = [
    eslintPlugin(),
    ...webpackOptions.plugins ?? [],
  ];
  if (webpackOptions.generateReport) {
    plugins.push(new BundleAnalyzerPlugin({
      analyzerMode: "static",
      reportFilename: join(process.cwd(), "bundle_report.html"),
      openAnalyzer: false,
    }));
  }
  return plugins;
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
 * @param [webpackOptions.babelPlugins]
 * List of extra babel plugins.
 *
 * @param [webpackOptions.mode]
 * Build mode. "development", "production" or "none".
 * Defaults to "development"
 *
 * @param [webpackOptions.generateReport]
 * Generate a bundle report HTML file.
 *
 * @param [webpackOptions.typescript]
 * Allow loading typescript source for webpack/babel.
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
    ?? {[targetName]: join("webres", targetName, "js", "loader.js")};
  const handledFiles = getHandledFiles(webpackEntry);
  const webpackOutput = computeWebpackOutput(webpackOptions, targetName);
  const webpackLoaders = webpackOptions.loaders
    ?? webpackLoadersDefault(
      {
        development: webpackOptions.mode === "development",
        defines: webpackOptions.defines,
        babel: {plugins: webpackOptions.babelPlugins},
        typescript: webpackOptions.typescript,
      },
    );
  const webpackResolve = computeWebpackResolve(webpackOptions);
  const webpackConfig: Record<string, unknown> = {
    mode: webpackOptions.mode,
    devtool: webpackOptions.mode === "development" ? "eval-source-map" : false,
    entry: webpackEntry,
    output: webpackOutput,
    externals: webpackOptions.externals,
    module: {rules: webpackLoaders},
    plugins: getWebpackPlugins(webpackOptions),
    resolve: webpackResolve,
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
