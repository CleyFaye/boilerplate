import {
  setRef,
  setSignalHandler,
} from "./express/autoclose";
import PipelineBuilder from "./express/pipelinebuilder";

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
   * @param {object} settings
   *
   * @param {Array<Router|object|function>} [settings.topLevels]
   * List top-level middlewares. See routes.
   *
   * @param {Array<Router|object|function>} [settings.routes]
   * List routes and routers.
   * For each router and function, a simple "use()" call is used.
   * If an object is provided, it must have two properties:
   *  - route: the actual route to listen to
   *  - handler: either a function, a router, or an array of functions that will
   *  be called in sequence on this request.
   *  - method: the method ("get", "post", "put", "options"). If missing,
   *    default to "get".
   *
   * @param {Array<string|object>} [settings.statics]
   * List of directory to serve as static content.
   * Can be either a string (the path) or an object with the following
   * properties:
   *  - root: the root in the filesystem for this static provider
   *  - options: (optional) the options to pass to static()
   *  - route: (optional) the route where the static resources will be served
   *
   * @param {Array<Router|object|function>} postStatics
   * Register routes handled after statics. See routes.
   *
   * @param {Array<function>} [settings.errorHandlers]
   * Process errors. Must be function with four parameters.
   *
   * @param {object} [settings.options]
   * @param {object} [settings.options.log]
   * @param {bool} [settings.options.log.route]
   * Log each route
   *
   * @param {bool} [settings.options.log.error]
   * Log error content
   *
   * @param {object} [settings.options.middleware]
   * @param {bool} [settings.options.middleware.json]
   * Parse JSON body requests
   *
   * @param {bool} [settings.options.defaultErrorHandler]
   * Setup the default error handler. Defaults to false.
   *
   * @param {function} [debugLog]
   * Function to log debug informations
   *
   * @return {Router}
   * The returned object can be used
   */

export const createPipeline = (settings, debugLog) => {
  if (debugLog) {
    debugLog("Creating PipelineBuilder");
  }
  const builder = new PipelineBuilder(debugLog);
  return builder.createPipeline(settings);
};

/** Start the server and register signal for automatic closing.
 *
 * @param {Express} app
 * @param {bool} [allowNonLocal]
 * Allow requests from outside of localhost
 *
 * @param {number} [port]
 * Port to listen from. Default to a random available port.
 *
 * @param {function} [shutdownFunction]
 * Function to call after the server is shutdown (all connection closed)
 *
 * @param {winstonLogger} [logger]
 *
 * @return {Promise<object>}
 * @property {number} port
 * The port the server is listening on
 *
 * @property {net.Server} server
 */
export const appStart = ({
  app,
  allowNonLocal,
  port,
  shutdownFunction,
  logger
}) => new Promise(resolve => {
  let server;
  const readyCallback = () => {
    const port = server.address().port;
    if (logger) {
      logger.info(`Listening on port ${port} (PID: ${process.pid})`);
    }
    setRef(server);
    setSignalHandler();
    resolve({
      port,
      server,
    });
  };
  server = allowNonLocal
    ? app.listen(port, readyCallback)
    : app.listen(port, "localhost", readyCallback);
  if (shutdownFunction) {
    server.on("close", shutdownFunction);
  }
});
