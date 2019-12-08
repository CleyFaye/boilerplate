import winston from "winston";
import expressWinston from "express-winston";
import {transports as baseTransports} from "../winston";

export const registerRouteLogger = (app, logger) => {
  app.use(expressWinston.logger({
    transports: logger ? undefined : baseTransports,
    format: logger ? undefined : winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
    winstonInstance: logger,
    meta: false,
    msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
    expressFormat: false,
    colorize: true,
  }));
};

export const registerErrorLogger = (app, logger) => {
  app.use(expressWinston.errorLogger({
    transports: logger ? undefined : baseTransports,
    format: logger ? undefined : winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
    winstonInstance: logger,
    exceptionToMeta: e => e,
    meta: false,
    msg: "{{req.method}} {{req.url}}",
    colorize: true,
  }));
};

