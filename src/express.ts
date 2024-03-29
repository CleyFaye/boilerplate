import {Server, AddressInfo} from "net";
import express from "express";
import winston from "winston";
import {
  setRef,
  setSignalHandler,
} from "./express/autoclose.js";
import PipelineBuilder, {PipelineSettings, LogFunction} from "./express/pipelinebuilder.js";

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
 * For convenience, providing timestamp and collapseNodeModules here will automatically
 * update the basic consoleLogger configuration.
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

/**
 * Function to call when the server stops.
 *
 * This is usually triggered by a SIGTERM.
 *
 * If the function returns "true", it prevent the process from stopping.
 * Otherwise `process.exit()` is called.
 */
type ShutdownFunction = () => Promise<boolean | undefined> | boolean | undefined;

export interface StartDefinition {
  app: express.Application;
  /** @deprecated use listenInterface instead */
  allowNonLocal?: boolean;
  /**
   * Which interface to listen on.
   *
   * Defaults to `false` which means listen only on localhost.
   * Set to `true` to listen on all interfaces
   * Set to an IP to bind on a specific interface.
   */
  listenInterface?: boolean | string;
  port?: number;
  shutdownFunction?: ShutdownFunction;
  logger?: winston.Logger;
  noReady?: boolean;
}

export interface StartResult {
  port: number;
  server: Server;
}

const handleShutdown = (logger?: winston.Logger, shutdownFunction?: ShutdownFunction) => () => {
  const fn = async () => {
    const noExit = shutdownFunction ? Boolean(await shutdownFunction()) : false;
    if (noExit) return;
    // We *want* to exit on server shutdown
    // eslint-disable-next-line no-process-exit
    process.exit();
  };
  fn().catch(err => {
    logger?.error(err);
  });
};

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
  listenInterface,
  port,
  shutdownFunction,
  logger,
  noReady,
}: StartDefinition): Promise<StartResult> => new Promise(resolve => {
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
    if (!noReady && process.send) process.send("ready");
  };
  if (allowNonLocal !== undefined && listenInterface !== undefined) {
    throw new Error("You can't specify both allowNonLocal and listenInterface at the same time");
  }
  if (allowNonLocal ?? listenInterface === true) {
    server = app.listen(port ?? 0, readyCallback);
  } else if (typeof listenInterface === "string") {
    server = app.listen(port ?? 0, listenInterface, readyCallback);
  } else {
    server = app.listen(port ?? 0, "localhost", readyCallback);
  }
  server.on("close", handleShutdown(logger, shutdownFunction));
});
