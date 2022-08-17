import winston from "winston";
import {TransformableInfo} from "logform";

// High value because of colorize()
const LOG_LEVEL_PADDING_SIZE = 19;

/**
 * Collapse all lines containing /node_modules/ into an ellipsis
 */
export const filterNodeModules = function* (message: string): Generator<string> {
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
export const prefixOutput = (
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

export interface LogConfig {
  timestamp: boolean;
  collapseNodeModules: boolean;
}

const logConfig: LogConfig = {
  timestamp: true,
  collapseNodeModules: true,
};

const customFormat = winston.format.printf((info: TransformableInfo) => {
  const message = (("stack" in info) ? info.stack : info.message) as string;
  const filteredMessage = logConfig.collapseNodeModules
    ? [...filterNodeModules(message)].join("\n")
    : message;
  return prefixOutput(info.level, filteredMessage, logConfig.timestamp);
});

/** Edit the configuration applied to consoleLogger */
export const setConfig = (config: LogConfig): void => {
  Object.assign(logConfig, config);
};

export const transports = [new winston.transports.Console()];

export const consoleLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    customFormat,
  ),
  transports,
});
