import {existsSync} from "node:fs";
import {join, resolve} from "path";

import {type ResolveOptions} from "webpack";
import {BundleAnalyzerPlugin} from "webpack-bundle-analyzer";

import {type BaseOptions} from "../util.js";

import * as util from "./util.js";

import type * as reactApp from "../reactapp.js";

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

const defaultLoadersDefine = (options: WebpackLoadersOptions): Array<unknown> => [
  "transform-define",
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "process.env.BUILD_TYPE": options.development ? "development" : "production",
    ...options.defines,
  },
];

const defaultLoadersPresetEnv = (options: WebpackLoadersOptions): Array<unknown> => [
  "@babel/preset-env",
  {
    corejs: options.babel?.corejs ?? defaultCoreJS,
    modules: false,
    targets:
      options.babel?.targets ??
      "> 2% and not dead, last 2 safari version, last 2 firefox version, last 2 chrome version, last 2 edge version, Firefox ESR",
    useBuiltIns: "usage",
  },
];

const defaultLoadersReact = (options: WebpackLoadersOptions): Array<unknown> => [
  "@babel/preset-react",
  {development: options.development},
];

/** Build the default webpack loaders list.
 *
 * Uses babel. Some options can be customized here.
 */
export const webpackLoadersDefault = (
  options: WebpackLoadersOptions,
): Array<Record<string, unknown>> => {
  const allFilesCheck = options.typescript ? /.(?:js|ts|tsx)$/u : /.js$/u;
  const res: Array<Record<string, unknown>> = [
    {
      exclude: /node_modules/u,
      test: allFilesCheck,
      use: {
        loader: "babel-loader",
        options: {
          cacheDirectory: true,
          plugins: [defaultLoadersDefine(options), ...(options.babel?.plugins ?? [])],
          presets: [defaultLoadersPresetEnv(options), defaultLoadersReact(options)],
        },
      },
    },
  ];
  if (options.typescript) {
    const alternativeConfig = "tsconfig-tsloader.json";
    const tsLoader = existsSync(alternativeConfig)
      ? [
          {
            loader: "ts-loader",
            options: {configFile: alternativeConfig},
          },
        ]
      : "ts-loader";
    res.push({
      exclude: /node_modules/u,
      test: /.(?:ts|tsx)$/u,
      use: tsLoader,
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
} =>
  webpackOptions.output ?? {
    chunkFilename: "[name]-[fullhash].js",
    filename: "[name].js",
    path: resolve("dist", targetName, "js"),
  };

const lastNamePosition = 2;

const getHandledFiles = (webpackEntry: Record<string, string>): Array<string> =>
  Object.keys(webpackEntry).reduce<Array<string>>((acc, cur) => {
    if (webpackEntry[cur].startsWith("webres")) {
      const split = webpackEntry[cur].split("/");
      acc.push(split.slice(lastNamePosition).join("/"));
    }
    webpackEntry[cur] = resolve(webpackEntry[cur]);
    return acc;
  }, []);

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

const getWatchTasks = (webpackOptions: WebpackOptions, targetName: string): Array<reactApp.WatchTaskDef> => {
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
  gruntConfig: util.GruntConfig,
  targetName: string,
  webpackConfig: Record<string, unknown>,
): Array<string> => {
  util.insertTask(gruntConfig, "webpack", `${targetName}_watch`, {
    ...webpackConfig,
    watch: true,
  });
  return [util.insertTask(gruntConfig, "webpack", targetName, webpackConfig)];
};

const computeWebpackResolve = (webpackOptions: WebpackOptions): Record<string, unknown> => {
  const res = {...webpackOptions.resolve};
  if (webpackOptions.typescript) {
    res.extensionAlias ??= {};
    res.extensionAlias[".js"] = [".ts", ".tsx", ".js", ".jsx"];
    res.extensionAlias[".mjs"] = [".mts", ".mtsx", ".mjs", ".mjsx"];
  }
  return res;
};

const getWebpackPlugins = (webpackOptions: WebpackOptions): Array<unknown> => {
  const plugins: Array<unknown> = [...(webpackOptions.plugins ?? [])];
  if (webpackOptions.generateReport) {
    plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
        openAnalyzer: false,
        reportFilename: join(process.cwd(), "bundle_report.html"),
      }),
    );
  }
  return plugins;
};

/** Add a webpack task for the reactApp recipe
 *
 * @param gruntConfig - Grunt configuration to add the task to
 *
 * @param targetName - Name of the target for the image minification task.
 *
 * @param webpackOptions - Options for the webpack task configuration.
 *
 * @returns
 * List of tasks added.
 * This function add "webpack:<targetName>".
 */
export const handle = (
  gruntConfig: util.GruntConfig,
  targetName: string,
  webpackOptions: WebpackOptions,
): reactApp.HandlerFunctionResult => {
  const webpackEntry = webpackOptions.entry ?? {
    [targetName]: join("webres", targetName, "js", "loader.js"),
  };
  const handledFiles = getHandledFiles(webpackEntry);
  const webpackOutput = computeWebpackOutput(webpackOptions, targetName);
  const webpackLoaders =
    webpackOptions.loaders ??
    webpackLoadersDefault({
      babel: {plugins: webpackOptions.babelPlugins},
      defines: webpackOptions.defines,
      development: webpackOptions.mode === "development",
      typescript: webpackOptions.typescript,
    });
  const webpackResolve = computeWebpackResolve(webpackOptions);
  const webpackConfig: Record<string, unknown> = {
    devtool: webpackOptions.mode === "development" ? "eval-source-map" : false,
    entry: webpackEntry,
    externals: webpackOptions.externals,
    mode: webpackOptions.mode,
    module: {rules: webpackLoaders},
    output: webpackOutput,
    plugins: getWebpackPlugins(webpackOptions),
    resolve: webpackResolve,
  };
  // Special case: I'm not sure I can move options in the task-specific part of
  // the configuration, so I add it at the toplevel of the "webpack" task.
  if (webpackOptions.options) {
    util.insertTask(gruntConfig, "webpack", "options", webpackOptions.options);
  }
  const requiredTasks = registerTasks(gruntConfig, targetName, webpackConfig);
  const watchTasks = getWatchTasks(webpackOptions, targetName);
  return { handledFiles, requiredTasks, watchTasks, };
};
