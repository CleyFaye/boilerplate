import express from "express";
import {
  registerRouteLogger,
  registerErrorLogger,
} from "./logger";

const defaultErrorHandlerImplementation = (err, req, res, next) => {
  if (!res.headersSent && err.statusCode) {
    let message = err.expose
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

export default class PipelineBuilder {
  constructor(debugLog) {
    this._debugLog = debugLog;
  }

  log(...args) {
    if (this._debugLog) {
      this._debugLog(...args);
    }
  }

  /** Add generic middlewares to a router
   *
   * @param {Router} router
   * @param {object} [middlewareOptions]
   * @param {bool} [middlewareOptions.json]
   * Process JSON body
   */
  setGenericMiddlewares(router, middlewareOptions) {
    const {json} = middlewareOptions || {};
    if (json) {
      this.log("express.json()");
      router.use(express.json());
    }
  }

  addRouterToRouter(baseRouter, newRouter) {
    baseRouter.use(newRouter);
  }

  addMiddlewareToRouter(router, middleware) {
    router.use(middleware);
  }

  addRouteToRouter(router, route) {
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
   * @param {Router} router
   * @param {Array<Router|object|function>} routes
   * See routes in createPipeline()
   */
  setRoutes(router, routes) {
    (routes || []).forEach(routeDef => {
      if (routeDef.name === "router") {
      // Raw router
        this.log("Adding raw router");
        this.addRouterToRouter(router, routeDef);
      } else if (routeDef.route && routeDef.handler) {
      // Specific routes
        this.addRouteToRouter(router, routeDef);
      } else {
      // Middleware
        this.log("Adding middleware");
        this.addMiddlewareToRouter(router, routeDef);
      }
    });
  }

  /** Appropriate call to express.static() */
  buildStaticHandler(staticDef) {
    return staticDef.root
      ? express.static(staticDef.root, staticDef.options)
      : express.static(staticDef);
  }

  /** Use a static definition */
  useComplexStatic(router, staticDef) {
    const staticHandler = this.buildStaticHandler(staticDef);
    if (staticDef.route) {
      this.log(`Adding statics for route "${staticDef.route}"`);
      router.use(staticDef.route, staticHandler);
    } else {
      this.log("Adding statics");
      router.use(staticHandler);
    }
  }

  /** Define static resources for the express server
   *
   * @param {Router} router
   * @param {Array} statics
   * See createPipeline()
   */
  setStatics(router, statics) {
    return (statics || []).forEach(staticDef =>
      this.useComplexStatic(router, staticDef)
    );
  }

  /** Register pre-route loggers
   *
   * @param {Router} router
   * @param {object} [logOptions]
   * @param {bool} [logOptions.route]
   * Log each route call
   * @param {winstonLogger} [logOptions.logger]
   */
  setRouteLogger(router, logOptions) {
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
  setErrorLogger(router, logOptions) {
    const {error, logger} = logOptions || {};
    if (error) {
      this.log("Adding error logger");
      registerErrorLogger(router, logger);
    }
  }

  setDefaultErrorHandler(
    router,
    enableDefaultErrorHandler
  ) {
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
  }) {
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
