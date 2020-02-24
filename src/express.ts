import {
  setRef,
  setSignalHandler,
} from "./express/autoclose";
import PipelineBuilder, {
  PipelineSettings, LogFunction,
} from "./express/pipelinebuilder";
import express from "express";
import winston from "winston";
import {
  Server, AddressInfo,
} from "net";

/** Create the full processing pipeline for an Express server
 *
 * This function creates a pipeline this way:
 *  - Pass generic middlewares (see options)
 *  - Pass custom top-level middlewares
 *  - Pass logging middleware (see options)
 *  - Pass routes
 *  - Pass error logging middleware (see options)
 *  - Pass error handlers
 *  - Fallback to a default error handler (see below)
 *
 * The default error handler is a layer above the express default error
 * handler.
 * If it is reached, it will check if the error object looks like an
 * http-errors exception, and if that's the case, send the error code and the
 * message (if applicable).
 * If the request accepts json, a json object with the error is returned.
 * Otherwise text is returned.
 *
 * @param settings
 *
 * @param [settings.topLevels]
 * List top-level middlewares. See routes.
 *
 * @param [settings.routes]
 * List routes and routers.
 * For each router and function, a simple "use()" call is used.
 * If an object is provided, it must have two properties:
 *  - route: the actual route to listen to
 *  - handler: either a function, a router, or an array of functions that will
 *  be called in sequence on this request.
 *  - method: the method ("get", "post", "put", "options"). If missing,
 *    default to "get".
 *
 * @param [settings.statics]
 * List of directory to serve as static content.
 * Can be either a string (the path) or an object with the following
 * properties:
 *  - root: the root in the filesystem for this static provider
 *  - options: (optional) the options to pass to static()
 *  - route: (optional) the route where the static resources will be served
 *
 * @param [settings.postStatics]
 * Register routes handled after statics. See routes.
 *
 * @param [settings.errorHandlers]
 * Process errors. Must be function with four parameters.
 *
 * @param [settings.options]
 * @param [settings.options.log]
 * @param [settings.options.log.route]
 * Log each route. Can be an object with all properties expected from
 * winston-express.logger()
 *
 * @param [settings.options.log.error]
 * Log error content. Can be either a boolean or an object with the
 * "collapseNodeModules" property. The error log will then display a truncated
 * stacktrace where lines containing node_modules are removed.
 *
 * @param [settings.options.log.timestamp]
 * Log timestamps on each lines
 *
 * @param [settings.options.log.logger]
 * An existing winston logger to use. Only the transport will be used.
 *
 * @param [settings.options.middleware]
 * @param [settings.options.middleware.urlencoded]
 * Parse URL encoded requests. Can be true or settings for urlencoded().
 * Default to handling application/x-www-form-urlencoded.
 *
 * @param [settings.options.middleware.text]
 * Parse raw text body requests. Can be true or settings for text()
 * Default to handling text/plain
 *
 * @param [settings.options.middleware.raw]
 * Parse raw body requests into an arraybuffer. Can be true or settings for
 * raw()
 * Default to handling application/octet-stream
 *
 * @param [settings.options.middleware.json]
 * Parse JSON body requests. Can be true or settings for json()
 * Default to handling application/json
 *
 * @param [settings.options.defaultErrorHandler]
 * Setup the default error handler. Defaults to false.
 *
 * @param [debugLog]
 * Function to log debug informations
 *
 * @return
 * The returned object can be used
 */

export const createPipeline = (
  settings: PipelineSettings,
  debugLog?: LogFunction,
): express.Router => {
  if (debugLog) {
    debugLog("Creating PipelineBuilder");
  }
  const builder = new PipelineBuilder(debugLog);
  return builder.createPipeline(settings);
};

/**
 * Configure the views rendering engine for an ExpressJS App
 */
export const setViewEngine = (
  app: express.Express,
  viewEngine: string,
  viewsDirectory: string,
  extraLocals?: Record<string, string | number>,
): void => {
  app.set("views", viewsDirectory);
  app.set("view engine", viewEngine);
  if (extraLocals) {
    app.locals = {
      ...app.locals,
      ...extraLocals,
    };
  }
};

export interface StartDefinition {
  app: express.Application;
  allowNonLocal?: boolean;
  port?: number;
  shutdownFunction?: () => void;
  logger?: winston.Logger;
}

export interface StartResult {
  port: number;
  server: Server;
}

/** Start the server and register signal for automatic closing.
 *
 * @param app
 * @param [allowNonLocal]
 * Allow requests from outside of localhost
 *
 * @param [port]
 * Port to listen from. Default to a random available port.
 *
 * @param [shutdownFunction]
 * Function to call after the server is shutdown (all connection closed)
 *
 * @param [logger]
 *
 * @return
 * @property port
 * The port the server is listening on
 *
 * @property server
 */
export const appStart = ({
  app,
  allowNonLocal,
  port,
  shutdownFunction,
  logger,
}: StartDefinition): Promise<StartResult> => new Promise((resolve) => {
  let server: Server | null = null;
  const readyCallback = (): void => {
    if (server === null) {
      throw new Error("Server reference can not be null");
    }
    const effectivePort = (server.address() as AddressInfo).port;
    if (logger) {
      logger.info(`Listening on port ${effectivePort} (PID: ${process.pid})`);
    }
    setRef(server);
    setSignalHandler();
    resolve({
      port: effectivePort,
      server,
    });
  };
  server = allowNonLocal
    ? app.listen(port ?? 0, readyCallback)
    : app.listen(port ?? 0, "localhost", readyCallback);
  if (shutdownFunction) {
    server.on("close", shutdownFunction);
  }
});
