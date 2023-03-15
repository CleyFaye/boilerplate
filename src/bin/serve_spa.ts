import * as path from "node:path";
import express from "express";
import minimist from "minimist";
import {singlePageApp} from "../express/middlewares/singlepageapp.js";
import {
  appStart,
  createPipeline,
} from "../express.js";
import {consoleLogger} from "../winston.js";

const ARGV_START_OFFSET = 2;

const {port, root, index, help, static: staticDirs} = minimist(
  process.argv.slice(ARGV_START_OFFSET),
) as {
  port?: number;
  root?: string;
  index?: string;
  help?: boolean;
  static?: string | Array<string>;
};

const DEFAULT_PORT = 3000;
const DEFAULT_PATH = path.join("dist", "webapp");
const DEFAULT_INDEX = "index.html";
const DEFAULT_STATIC = ["js", "css", "img"];

if (help) {
  consoleLogger.info(`
Usage:

serve_spa \\
  [--port=${DEFAULT_PORT}] \\
  [--root=${DEFAULT_PATH}] \\
  [--index=${DEFAULT_INDEX}] \\
  [--static=js…] \\
  [--help]

The --static argument can be repeated to add more directories to it.
It defaults to ${JSON.stringify(DEFAULT_STATIC)}.
`.trim());
  // eslint-disable-next-line no-process-exit
  process.exit(0);
}

const getPort = (): number => port ?? DEFAULT_PORT;
const getStatic = (): Array<string> | undefined => {
  if (!staticDirs) return;
  return Array.isArray(staticDirs) ? staticDirs : [staticDirs];
};

const app = express();
app.use(createPipeline({
  routes: singlePageApp({
    rootDir: root ?? "dist/webapp",
    htmlFile: index,
    staticRootDirectories: getStatic(),
  }),
  options: {
    defaultErrorHandler: true,
    log: {
      route: true,
      error: true,
      logger: consoleLogger,
    },
  },
}));

appStart({
  app,
  port: getPort(),
  logger: consoleLogger,
}).then(({port: activePort}) => {
  consoleLogger.info(`SPA served on port ${activePort}`);
})
  .catch(consoleLogger.error);
