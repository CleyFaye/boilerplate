import express from "express";
import {
  OptionsJson,
  OptionsUrlencoded,
  OptionsText,
  Options as OptionsRaw,
} from "body-parser";
import winston from "winston";
import createError from "http-errors";
import {setConfig} from "../winston.js";
import {
  registerRouteLogger,
  registerErrorLogger,
  LoggerOptions,
  ErrorLoggerOptions,
} from "./logger.js";

const defaultErrorHandler = (
  err: createError.HttpError,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void => {
  if (!res.headersSent && err.statusCode) {
    const message = err.expose
      ? err.message
      : undefined;
    const accepted = req.accepts(
      [
        "text",
        "html",
        "json",
      ],
    );
    if (accepted === "json") {
      res.status(err.statusCode).send({
        statusCode: err.statusCode,
        message,
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

export type LogFunction = (...args: Array<string|number|Record<string, unknown>>) => void;

export interface MiddlewareOptions {
  urlencoded?: boolean | OptionsUrlencoded;
  text?: boolean | OptionsText;
  raw?: boolean | OptionsRaw;
  json?: boolean | OptionsJson;
}

export type ComplexRouteHandler =
  express.RequestHandler
  | express.Router
  | Array<express.RequestHandler>;

export interface ComplexRouteDefinition {
  route: string;
  handler: ComplexRouteHandler;
  method?: "get"|"post"|"put"|"options";
}

export type RouteDefinition =
  ComplexRouteDefinition
  | express.RequestHandler;

export type RouterDefinition =
  express.Router
  | RouteDefinition;

export type RouterWithNullDef = RouterDefinition | null | undefined;

export interface ComplexStaticDefinition {
  root: string;
  options?: Record<string, unknown>;
  route?: string;
}

export type StaticDefinition =
  ComplexStaticDefinition
  | string;

export interface LogOptions {
  route?: LoggerOptions;
  error?: ErrorLoggerOptions;
  logger?: winston.Logger;
  timestamp?: boolean;
}

export interface PipelineSettings {
  topLevels?: Array<RouterWithNullDef>;
  routes?: Array<RouterWithNullDef>;
  statics?: Array<StaticDefinition>;
  postStatics?: Array<RouterWithNullDef>;
  errorHandlers?: Array<express.ErrorRequestHandler>;
  options?: {
    log?: LogOptions;
    middleware?: MiddlewareOptions;
    defaultErrorHandler?: boolean;
  };
}

export default class PipelineBuilder {
  private _debugLog?: LogFunction;

  public constructor(debugLog?: LogFunction) {
    this._debugLog = debugLog;
  }

  private static _addRouterToRouter(
    baseRouter: express.Router,
    newRouter: express.Router,
  ): void {
    baseRouter.use(newRouter);
  }

  private static _addMiddlewareToRouter(
    router: express.Router,
    middleware: express.RequestHandler,
  ): void {
    router.use(middleware);
  }

  /** Register error handlers
   *
   * @param router
   * @param errorHandlers
   */
  private static _setErrorHandlers(
    router: express.Router,
    errorHandlers?: Array<express.ErrorRequestHandler>,
  ): void {
    (errorHandlers ?? []).forEach(errorHandler => {
      router.use(errorHandler);
    });
  }

  /** Appropriate call to express.static() */
  private static _buildStaticHandler(
    staticDef: StaticDefinition,
  ): express.RequestHandler {
    return typeof staticDef === "string"
      ? express.static(staticDef)
      : express.static(staticDef.root, staticDef.options);
  }

  /** See createPipeline() for more info */
  public createPipeline({
    topLevels,
    routes,
    statics,
    postStatics,
    errorHandlers,
    options,
  }: PipelineSettings): express.Router {
    const {middleware, log, defaultErrorHandler: useDefaultErrorHandler} = options ?? {};
    this.internalLog("createPipeline()");
    if (log) {
      const errorConfig = typeof log.error === "boolean"
        ? {}
        : log.error ?? {};
      setConfig({
        timestamp: log.timestamp ?? false,
        collapseNodeModules: errorConfig.collapseNodeModules ?? true,
      });
    }
    const router = express.Router();
    this.internalLog("setGenericMiddlewares()");
    this._setGenericMiddlewares(router, middleware);
    this.internalLog("add top level routes/middleware");
    this._setRoutes(router, topLevels);
    this.internalLog("add logger (route call)");
    this._setRouteLogger(router, log);
    this.internalLog("add routes");
    this._setRoutes(router, routes);
    this.internalLog("add statics");
    this._setStatics(router, statics);
    this.internalLog("add post statics routes");
    this._setRoutes(router, postStatics);
    this.internalLog("add logger (errors)");
    this._setErrorLogger(router, log);
    this.internalLog("add error handlers");
    PipelineBuilder._setErrorHandlers(router, errorHandlers);
    this.internalLog("add default error handlers");
    this._setDefaultErrorHandler(router, useDefaultErrorHandler);
    return router;
  }

  protected internalLog(...args: Array<string|number|Record<string, string>>): void {
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
  private _setGenericMiddlewares(
    router: express.Router,
    middlewareOptions?: MiddlewareOptions,
  ): void {
    const {
      urlencoded,
      text,
      raw,
      json,
    } = middlewareOptions ?? {};
    if (urlencoded) {
      this.internalLog("express.urlencoded()");
      const options = urlencoded === true
        ? {extended: true}
        : urlencoded;
      router.use(express.urlencoded(options));
    }
    if (text) {
      this.internalLog("express.text()");
      const options = text === true
        ? undefined
        : text;
      router.use(express.text(options));
    }
    if (raw) {
      this.internalLog("express.raw()");
      const options = raw === true
        ? undefined
        : raw;
      router.use(express.raw(options));
    }
    if (json) {
      this.internalLog("express.json()");
      const options = json === true
        ? undefined
        : json;
      router.use(express.json(options));
    }
  }

  private _addRouteToRouter(
    router: express.Router,
    route: ComplexRouteDefinition,
  ): void {
    const method = route.method ?? "get";
    this.internalLog(
      `Adding route "${route.route}" [${method}]`,
    );
    // Simple route definition
    if (Array.isArray(route.handler)) {
      // Multiple handlers for same route
      route.handler.forEach(
        handler => router[method](route.route, handler),
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
  private _setRoutes(
    router: express.Router,
    routes?: Array<RouterWithNullDef>,
  ): void {
    (routes ?? []).filter<RouterDefinition>(
      (e): e is RouterDefinition => Boolean(e),
    ).forEach(routeDef => {
      const asRouter = routeDef as express.Router;
      const asRouteDef = routeDef as ComplexRouteDefinition;
      const asRequestHandler = routeDef as express.RequestHandler;
      if (asRouter.name === "router") {
        // Raw router
        this.internalLog("Adding raw router");
        PipelineBuilder._addRouterToRouter(router, asRouter);
      } else if (asRouteDef.route) {
        // Specific routes
        this._addRouteToRouter(router, asRouteDef);
      } else {
        // Middleware
        this.internalLog("Adding middleware");
        PipelineBuilder._addMiddlewareToRouter(router, asRequestHandler);
      }
    });
  }

  /** Use a static definition */
  private _useComplexStatic(
    router: express.Router,
    staticDef: StaticDefinition,
  ): void {
    const staticHandler = PipelineBuilder._buildStaticHandler(staticDef);
    if (typeof staticDef === "string") {
      this.internalLog("Adding statics");
      router.use(staticHandler);
    } else if (staticDef.route) {
      this.internalLog(`Adding statics for route "${staticDef.route}"`);
      router.use(staticDef.route, staticHandler);
    } else {
      this.internalLog("Adding statics");
      router.use(staticHandler);
    }
  }

  /** Define static resources for the express server
   *
   * @param router
   * @param statics
   * See createPipeline()
   */
  private _setStatics(
    router: express.Router,
    statics?: Array<StaticDefinition>,
  ): void {
    (statics ?? []).forEach(
      staticDef => this._useComplexStatic(router, staticDef),
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
  private _setRouteLogger(
    router: express.Router,
    logOptions?: LogOptions,
  ): void {
    const {route} = logOptions ?? {};
    if (route) {
      this.internalLog("Adding route logger");
      registerRouteLogger(router, logOptions);
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
  private _setErrorLogger(
    router: express.Router,
    logOptions?: LogOptions,
  ): void {
    const {error} = logOptions ?? {};
    if (error) {
      this.internalLog("Adding error logger");
      registerErrorLogger(router, logOptions);
    }
  }

  private _setDefaultErrorHandler(
    router: express.Router,
    enableDefaultErrorHandler?: boolean,
  ): void {
    if (enableDefaultErrorHandler) {
      this.internalLog("Adding default error handler");
      router.use(defaultErrorHandler);
    }
  }
}
