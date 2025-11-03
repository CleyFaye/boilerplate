import * as path from "node:path";
import * as fs from "node:fs";
import express from "express";
import minimist from "minimist";
import {singlePageApp} from "../express/middlewares/singlepageapp.js";
import type {Server} from "node:net";

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
  console.log(`
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
      if (!fs.existsSync(staticsrc)) continue;
      result.push(
        ...fs.readFileSync(staticsrc, "utf8")
          .split("\n")
          .filter(c => c),
      );
    }
  }
  return result.length > 0 ? result : undefined;
};

const app = express();
app.use((req, res, next) => {
  console.log(`${Date.now()} - ${req.method} ${req.url}`);
  next();
});
app.use(singlePageApp({
  rootDir: root ?? "dist/webapp",
  htmlFile: index,
  staticRootDirectories: getStatic(),
}));

let server: null | Server = null;
const maxSignals = 5;
let signalsReceived = 0;

const signalHandler = (signal: string): void => {
  if (!server) {
    console.log(`Received ${signal}, but server not started; exiting`);
    process.exit(1);
  }
  if (signalsReceived === 0) {
    signalsReceived = 1;
    console.log(`Received ${signal}, stopping server`);
    server?.close();
    return;
  }
  if (signalsReceived < maxSignals) {
    ++signalsReceived;
    console.log(`Received ${signal}, ${signalsReceived} / ${maxSignals}`);
  } else {
    console.log(`Received final ${signal}, exiting`);
    process.exit(2);
  }
}

process.on("SIGINT", () => {
  signalHandler("SIGINT");
});

process.on("SIGTERM", () => {
  signalHandler("SIGTERM");
});

server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
