import winston from "winston";
import expressWinston from "express-winston";
import consoleLogger from "../winston.js";
import {Router} from "express";
import {
  Format,
  TransformableInfo,
} from "logform";
import {LogOptions} from "./pipelinebuilder.js";

// High value because of colorize()
const LOG_LEVEL_PADDING_SIZE = 19;

export type LoggerOptions =
  expressWinston.LoggerOptions
  | boolean;

interface ErrorLoggerConfiguration {
  collapseNodeModules?: boolean;
}

export type ErrorLoggerOptions =
  ErrorLoggerConfiguration
  | boolean;

/**
 * Collapse all lines containing /node_modules/ into an ellipsis
 */
const filterNodeModules = function* (message: string): Generator<string> {
  let inNodeModules = false;
  const lines = message.split("\n");
  for (const line of lines) {
    if (/\/node_modules\//u.exec(line)) {
      if (!inNodeModules) {
        inNodeModules = true;
        yield "[...]";
      }
    } else {
      inNodeModules = false;
      yield line;
    }
  }
};

/**
 * Prefix all lines with the level and the timestamp if needed
 */
const prefixOutput = (
  level: string,
  message: string,
  timestamp: boolean | undefined,
): string => {
  const timestampPrefix = timestamp
    ? `${new Date().toISOString()} `
    : "";
  const levelPrefix = `${level.toString().padStart(LOG_LEVEL_PADDING_SIZE)}: `;
  return message.split("\n").map(
    line => `${timestampPrefix}${levelPrefix}${line}`,
  )
    .join("\n");
};

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
     = `${info.message} ${metaString === "{}" ? "" : metaString}`;
    return prefixOutput(info.level, finalMessage, outputTimestamp);
  },
);

export const registerRouteLogger = (
  app: Router,
  logOptions?: LogOptions,
): void => {
  const {route, logger, timestamp} = logOptions ?? {};
  let extraConfig;
  if (typeof route === "boolean") {
    extraConfig = {};
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
  if (logger) {
    app.use(expressWinston.logger({
      transports: logger.transports,
      ...baseConfig,
      ...extraConfig,
    }));
  } else {
    app.use(expressWinston.logger({
      transports: consoleLogger.transports,
      ...baseConfig,
      ...extraConfig,
    }));
  }
};

const customErrorFormat = (
  outputTimestamp: boolean | undefined,
  config: ErrorLoggerConfiguration,
): Format => {
  const {collapseNodeModules} = config;
  return winston.format.printf(
    (info: TransformableInfo) => {
      const meta: InfoMeta | undefined = info.meta as InfoMeta;
      const finalMessage = collapseNodeModules
        ? [...filterNodeModules(meta.message)].join("\n")
        : meta.message;
      return prefixOutput(info.level, finalMessage, outputTimestamp);
    },
  );
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
      transports: consoleLogger.transports,
      format: winston.format.combine(
        winston.format.errors(),
        winston.format.colorize(),
        customErrorFormat(timestamp, config),
      ),
      meta: false,
    }));
  }
};
