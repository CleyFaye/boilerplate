import winston from "winston";
import expressWinston from "express-winston";
import {transports as baseTransports} from "../winston";
import {Router} from "express";

export const registerRouteLogger = (
  app: Router,
  logger?: winston.Logger,
): void => {
  if (logger) {
    app.use(expressWinston.logger({
      winstonInstance: logger,
      meta: false,
      // eslint-disable-next-line max-len
      msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
      expressFormat: false,
      colorize: true,
    }));
  } else {
    app.use(expressWinston.logger({
      transports: baseTransports,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      meta: false,
      // eslint-disable-next-line max-len
      msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
      expressFormat: false,
      colorize: true,
    }));
  }
};

export const registerErrorLogger = (
  app: Router,
  logger?: winston.Logger,
): void => {
  if (logger) {
    app.use(expressWinston.errorLogger({
      winstonInstance: logger,
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
      winstonInstance: logger,
      meta: false,
      msg: "{{req.method}} {{req.url}}",
    }));
  }
};
