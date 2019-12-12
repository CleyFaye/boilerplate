import express from "express";
import {
  registerRouteLogger,
  registerErrorLogger,
} from "./logger";
import winston from "winston";
import createError from "http-errors";

const defaultErrorHandlerImplementation = (
  err: createError.HttpError,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  if (!res.headersSent && err.statusCode) {
    const message = err.expose
      ? err.message
      : undefined;
    if (req.accepts("json") === "json") {
      res.status(err.statusCode).send({
        statusCode: err.statusCode,
        message: message,
      });
      return;
    }
    if (message) {
      res.status(err.statusCode).send(message);
    } else {
      res.sendStatus(err.statusCode);
    }
    return;
  }
  next(err);
};

export type LogFunction = (...args: Array<string|number|object>) => void;

export interface MiddlewareOptions {
  json?: boolean;
}

export type ComplexRouteHandler =
  express.RequestHandler
  | express.Router
  | Array<express.RequestHandler>;

export interface ComplexRouteDefinition {
  route: string;
  handler: ComplexRouteHandler;
  method: "get"|"post"|"put"|"options";
}

export type RouteDefinition =
  ComplexRouteDefinition
  | express.RequestHandler;

export interface ComplexStaticDefinition {
  root: string;
  options?: object;
  route?: string;
}

export type StaticDefinition =
  ComplexStaticDefinition
  | string;

export interface LogOptions {
  route?: boolean;
  error?: boolean;
  logger?: winston.Logger;
}

export interface PipelineSettings {
  topLevels?: Array<express.Router | RouteDefinition>;
  routes?: Array<express.Router | RouteDefinition>;
  statics?: Array<StaticDefinition>;
  postStatics?: Array<express.Router | RouteDefinition>;
  errorHandlers?: Array<RouteDefinition>;
  options?: {
    log?: LogOptions;
    middleware?: MiddlewareOptions;
    defaultErrorHandler?: boolean;
  };
}

export default class PipelineBuilder {
  private _debugLog?: LogFunction;

  constructor(debugLog?: LogFunction) {
    this._debugLog = debugLog;
  }

  log(...args: Array<string|number|object>): void {
    if (this._debugLog) {
      this._debugLog(...args);
    }
  }

  /** Add generic middlewares to a router
   *
   * @param router
   * @param [middlewareOptions]
   * @param [middlewareOptions.json]
   * Process JSON body
   */
  setGenericMiddlewares(
    router: express.Router,
    middlewareOptions?: MiddlewareOptions
  ): void {
    const {json} = middlewareOptions || {};
    if (json) {
      this.log("express.json()");
      router.use(express.json());
    }
  }

  addRouterToRouter(
    baseRouter: express.Router,
    newRouter: express.Router
  ): void {
    baseRouter.use(newRouter);
  }

  addMiddlewareToRouter(
    router: express.Router,
    middleware: express.RequestHandler
  ): void {
    router.use(middleware);
  }

  addRouteToRouter(
    router: express.Router,
    route: ComplexRouteDefinition
  ): void {
    const method = route.method || "get";
    this.log(
      `Adding route "${route.route}" [${method}]`
    );
    // Simple route definition
    if (Array.isArray(route.handler)) {
      // Multiple handlers for same route
      route.handler.forEach(
        handler => router[method](route.route, handler)
      );
    } else {
      // Simple handler
      router[method](route.route, route.handler);
    }
  }

  /** Register routes
   *
   * @param router
   * @param routes
   * See routes in createPipeline()
   */
  setRoutes(
    router: express.Router,
    routes?: Array<express.Router | RouteDefinition>
  ): void {
    (routes || []).forEach(routeDef => {
      const asRouter = routeDef as express.Router;
      const asRouteDef = routeDef as ComplexRouteDefinition;
      const asRequestHandler = routeDef as express.RequestHandler;
      if (asRouter.name === "router") {
        // Raw router
        this.log("Adding raw router");
        this.addRouterToRouter(router, asRouter);
      } else if (asRouteDef.route && asRouteDef.handler) {
        // Specific routes
        this.addRouteToRouter(router, asRouteDef);
      } else {
        // Middleware
        this.log("Adding middleware");
        this.addMiddlewareToRouter(router, asRequestHandler);
      }
    });
  }

  /** Appropriate call to express.static() */
  buildStaticHandler(staticDef: StaticDefinition): express.RequestHandler {
    return typeof staticDef === "string"
      ? express.static(staticDef)
      : express.static(staticDef.root, staticDef.options);
  }

  /** Use a static definition */
  useComplexStatic(
    router: express.Router,
    staticDef: StaticDefinition
  ): void {
    const staticHandler = this.buildStaticHandler(staticDef);
    if (typeof staticDef === "string") {
      this.log("Adding statics");
      router.use(staticHandler);
    } else {
      this.log(`Adding statics for route "${staticDef.route}"`);
      if (staticDef.route) {
        router.use(staticDef.route, staticHandler);
      } else {
        router.use(staticHandler);
      }
    }
  }

  /** Define static resources for the express server
   *
   * @param router
   * @param statics
   * See createPipeline()
   */
  setStatics(
    router: express.Router,
    statics?: Array<StaticDefinition>
  ): void {
    (statics || []).forEach(staticDef =>
      this.useComplexStatic(router, staticDef)
    );
  }

  /** Register pre-route loggers
   *
   * @param router
   * @param [logOptions]
   * @param [logOptions.route]
   * Log each route call
   * @param [logOptions.logger]
   */
  setRouteLogger(
    router: express.Router,
    logOptions?: LogOptions
  ): void {
    const {route, logger} = logOptions || {};
    if (route) {
      this.log("Adding route logger");
      registerRouteLogger(router, logger);
    }
  }

  /** Register post-route loggers
   *
   * @param {Router} router
   * @param {object} [logOptions]
   * @param {bool} [logOptions.error]
   * Log each error
   * @param {winstonLogger} [logOptions.logger]
   */
  setErrorLogger(
    router: express.Router,
    logOptions?: LogOptions
  ): void {
    const {error, logger} = logOptions || {};
    if (error) {
      this.log("Adding error logger");
      registerErrorLogger(router, logger);
    }
  }

  setDefaultErrorHandler(
    router: express.Router,
    enableDefaultErrorHandler?: boolean
  ): void {
    if (enableDefaultErrorHandler) {
      this.log("Adding default error handler");
      router.use(defaultErrorHandlerImplementation);
    }
  }

  /** See createPipeline() for more info */
  createPipeline({
    topLevels,
    routes,
    statics,
    postStatics,
    errorHandlers,
    options,
  }: PipelineSettings): express.Router {
    const {middleware, log, defaultErrorHandler} = options || {};
    this.log("createPipeline()");
    const router = express.Router();
    this.log("setGenericMiddlewares()");
    this.setGenericMiddlewares(router, middleware);
    this.log("add top level routes/middleware");
    this.setRoutes(router, topLevels);
    this.log("add logger (route call)");
    this.setRouteLogger(router, log);
    this.log("add routes");
    this.setRoutes(router, routes);
    this.log("add statics");
    this.setStatics(router, statics);
    this.log("add post statics routes");
    this.setRoutes(router, postStatics);
    this.log("add logger (errors)");
    this.setErrorLogger(router, log);
    this.log("add error handlers");
    this.setRoutes(router, errorHandlers);
    this.log("add default error handlers");
    this.setDefaultErrorHandler(router, defaultErrorHandler);
    return router;
  }
}
