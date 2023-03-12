import * as path from "node:path";
import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

interface SinglePageAppConfig {
  /** Path to the file to serve for the whole application
   *
   * Any request coming for a directory not listed in the static list will reply with index.html
   * from this directory.
   */
  rootDir: string;
  /** Name of the app html file
   *
   * Defaults to "index.html"
   */
  htmlFile?: string;
  /** Directories to serve as-is
   *
   * These are served by a static middleware.
   * It is advised, if possible, to serve these from outside of node.
   *
   * Defaults to `["js", "css", "img"]`.
   */
  staticRootDirectories?: Array<string>;
}

/** Serve a single page webapp using a modern browser URL router
 *
 * This will serve all requests from the router using the provided index.html file, except for files
 * in the listed static directories.
 *
 * Note that it is advised to serve these static directories from outside of node (ideally from a
 * frontend server upper in the request handling).
 *
 * Basic usage:
 * ```JavaScript
 * import express from "express";
 * import {singlePageApp} from "@cley_faye/boilerplate/lib/express/middlewares/singlepageapp.js";
 *
 * const someRouter = express.Router();
 * someRouter.use("/app", singlePageApp({rootDir: "dist/webapp"});
 * ```
 */
export const singlePageApp = (config: SinglePageAppConfig): Array<RequestHandler> => {
  const rootDir = path.resolve(config.rootDir);
  const htmlFile = config.htmlFile ?? "index.html";
  const staticDirs = (config.staticRootDirectories ?? ["js", "css", "img"]).map(c => `/${c}`);
  const appRoute = (req: Request, res: Response, next: NextFunction) => {
    for (const candidates of staticDirs) if (req.url.startsWith(candidates)) return next();
    res.sendFile(htmlFile, {root: rootDir}, (err: Error) => next(err));
  };
  const staticRoute = express.static(rootDir);
  return [appRoute, staticRoute];
};
