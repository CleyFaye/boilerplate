import winston from "winston";
import expressWinston, {BaseLoggerOptions} from "express-winston";
import {Request, Router} from "express";
import {
  Format,
  TransformableInfo,
} from "logform";
import {
  transports,
  prefixOutput,
  customFormat,
} from "../winston.js";
import {LogOptions, UserFromReqFunc} from "./pipelinebuilder.js";

export type LoggerOptions =
  expressWinston.BaseLoggerOptions
  | boolean;

interface ErrorLoggerConfiguration {
  /** @deprecated Use collapseStacktrace */
  collapseNodeModules?: boolean;
  collapseStacktrace?: boolean;
  extraFilter?: Array<RegExp> | RegExp;
}

export type ErrorLoggerOptions =
  ErrorLoggerConfiguration
  | boolean;

interface InfoMeta {
  res?: {
    statusCode?: number
  };
  responseTime?: number;
  req?: Record<string, string>;
  message: string;
}

const customRouteFormat = (
  outputTimestamp: boolean | undefined,
): Format => winston.format.printf(
  (info: TransformableInfo) => {
    const meta: InfoMeta | undefined = info.meta as InfoMeta;
    // Clean the meta object from stuff displayed in the regular message
    if (meta.res?.statusCode) {
      delete meta.res.statusCode;
    }
    if (meta.res) {
      if (Object.keys(meta.res).length === 0) {
        delete meta.res;
      }
    }
    if ("responseTime" in meta) {
      delete meta.responseTime;
    }
    if (meta.req) {
      if (Object.keys(meta.req).length === 0) {
        delete meta.req;
      }
    }
    const metaString = JSON.stringify(info.meta);
    const finalMessage
      = `${(info.message as string).toString()} ${metaString === "{}" ? "" : metaString}`;
    return prefixOutput(info.level, finalMessage, outputTimestamp);
  },
);

export interface LoggingData {
  extraLoggingData?: Record<string, unknown>,
}

export interface RequestWithLoggingData extends Request {
  _cleyfayeLogging?: LoggingData;
  _routeWhitelists?: {
    body?: Array<string>;
  };
}

/** Return the default value for route logger is it is set as `true` */
export const defaultRouteLoggerConfig = (
  userFromReq?: UserFromReqFunc,
): BaseLoggerOptions => ({
  meta: true,
  requestWhitelist: ["body"],
  responseWhitelist: [],
  dynamicMeta: (req: Request): Record<string, unknown> => {
    const castReq = req as RequestWithLoggingData;
    const data: Record<string, unknown> = {...castReq._cleyfayeLogging?.extraLoggingData};
    if (userFromReq) data.user = userFromReq(req) ?? null;
    return data;
  },
});

export const registerRouteLogger = (
  app: Router,
  logOptions?: LogOptions,
): void => {
  const {route, timestamp, userFromReq} = logOptions ?? {};
  let extraConfig;
  if (typeof route === "boolean") {
    extraConfig = defaultRouteLoggerConfig(userFromReq);
  } else {
    extraConfig = {...route};
    const rec = extraConfig as Record<string, unknown>;
    if (rec.winstonInstance) {
      delete rec.winstonInstance;
    }
  }
  const baseConfig = {
    meta: true,
    requestWhitelist: ["body"],
    bodyWhitelist: [],
    expressFormat: false,
    format: winston.format.combine(
      winston.format.colorize(),
      customRouteFormat(timestamp),
    ),
    colorize: true,
    msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
  };
  app.use(expressWinston.logger({
    transports,
    ...baseConfig,
    ...extraConfig,
  }));
};

const getExtraFilter = (
  userExtraFilter: Array<RegExp> | RegExp | undefined,
): Array<RegExp> | RegExp => {
  const expressRegEx = /node_modules\/express/u;
  if (!userExtraFilter) return expressRegEx;
  if (Array.isArray(userExtraFilter)) return [expressRegEx, ...userExtraFilter];
  return [expressRegEx, userExtraFilter];
};

export const registerErrorLogger = (
  app: Router,
  logOptions?: LogOptions,
): void => {
  const {error, logger, timestamp} = logOptions ?? {};
  const config = typeof error === "boolean"
    ? {}
    : error ?? {};
  if (logger) {
    app.use(expressWinston.errorLogger({
      transports: logger.transports,
      meta: false,
      msg: "{{req.method}} {{req.url}}",
    }));
  } else {
    app.use(expressWinston.errorLogger({
      transports,
      format: customFormat(
        timestamp,
        config.collapseStacktrace ?? config.collapseNodeModules,
        getExtraFilter(config.extraFilter),
      ),
      meta: false,
    }));
  }
};
