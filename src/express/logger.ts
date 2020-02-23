import winston from "winston";
import expressWinston from "express-winston";
import {transports as baseTransports} from "../winston";
import {Router} from "express";

export type LoggerOptions =
  expressWinston.LoggerOptions
  | boolean;

export const registerRouteLogger = (
  app: Router,
  routerOptions: LoggerOptions,
  logger?: winston.Logger,
): void => {
  let extraConfig;
  if (typeof routerOptions === "boolean") {
    extraConfig = {};
  } else {
    extraConfig = {...routerOptions};
    if (extraConfig.winstonInstance) {
      delete extraConfig.winstonInstance;
    }
  }
  const baseConfig = {
    meta: false,
    // eslint-disable-next-line max-len
    msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
    expressFormat: false,
    colorize: true,
  };
  if (logger) {
    app.use(expressWinston.logger({
      winstonInstance: logger,
      ...baseConfig,
      ...extraConfig,
    }));
  } else {
    app.use(expressWinston.logger({
      transports: baseTransports,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      ...baseConfig,
      ...extraConfig,
    }));
  }
};

export const registerErrorLogger = (
  app: Router,
  logger?: winston.Logger,
): void => {
  if (logger) {
    app.use(expressWinston.errorLogger({
      transports: logger.transports,
      meta: false,
      msg: "{{req.method}} {{req.url}}",
    }));
  } else {
    app.use(expressWinston.errorLogger({
      transports: baseTransports,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      meta: false,
      msg: "{{req.method}} {{req.url}}",
    }));
  }
};
