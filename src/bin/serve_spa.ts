import * as path from "node:path";
import {existsSync, readFileSync} from "node:fs";
import express from "express";
import minimist from "minimist";
import {singlePageApp} from "../express/middlewares/singlepageapp.js";
import {
  appStart,
  createPipeline,
} from "../express.js";
import {consoleLogger} from "../winston.js";

const ARGV_START_OFFSET = 2;

const {port, root, index, help, staticlist, static: staticDirs} = minimist(
  process.argv.slice(ARGV_START_OFFSET),
) as {
  port?: number;
  root?: string;
  index?: string;
  help?: boolean;
  staticlist?: string | Array<string>;
  static?: string | Array<string>;
};

const DEFAULT_PORT = 3000;
const DEFAULT_PATH = path.join("dist", "webapp");
const DEFAULT_INDEX = "index.html";
const DEFAULT_STATICFILE = "spa_static.config";
const DEFAULT_STATIC = ["js", "css", "img"];

if (help) {
  consoleLogger.info(`
Usage:

serve_spa \\
  [--port=${DEFAULT_PORT}] \\
  [--root=${DEFAULT_PATH}] \\
  [--index=${DEFAULT_INDEX}] \\
  [--staticlist=${DEFAULT_STATICFILE}] \\
  [--static=js…] \\
  [--help]

The --static argument can be repeated to add more directories to it.
It defaults to ${JSON.stringify(DEFAULT_STATIC)}.

The staticfile value is a text file with one static directory line.
If present, they are merged with the CLI arguments.
`.trim());
  // eslint-disable-next-line no-process-exit
  process.exit(0);
}

const getPort = (): number => port ?? DEFAULT_PORT;
const getStatic = (): Array<string> | undefined => {
  const result: Array<string> = [];
  if (staticDirs) result.push(...(Array.isArray(staticDirs) ? staticDirs : [staticDirs]));
  if (staticlist) {
    for (const staticsrc of (Array.isArray(staticlist) ? staticlist : [staticlist])) {
      if (!existsSync(staticsrc)) continue;
      result.push(
        ...readFileSync(staticsrc, "utf8")
          .split("\n")
          .filter(c => c),
      );
    }
  }
  return result.length > 0 ? result : undefined;
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
