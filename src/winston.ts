import winston from "winston";
import {Format, TransformableInfo} from "logform";

// High value because of colorize()
const LOG_LEVEL_PADDING_SIZE = 10;

const stackFilterRegex = /(?:at process|at runMicrotasks)/u;

/**
 * Collapse useless lines in stacktrace
 */
export const filterStacktrace = function* (message: string): Generator<string> {
  let inCollapse = false;
  const lines = message.split("\n");
  for (const line of lines) {
    if (stackFilterRegex.exec(line)) {
      if (!inCollapse) {
        inCollapse = true;
        yield "[...]";
      }
    } else {
      inCollapse = false;
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
  const levelEmpty = `${" ".repeat(LOG_LEVEL_PADDING_SIZE)}  `;
  return message.split("\n").map(
    (line, id) => `${timestampPrefix}${id === 0 ? levelPrefix : levelEmpty}${line}`,
  )
    .join("\n");
};

export interface LogConfig {
  timestamp: boolean;
  /** @deprecated Use collapseStacktrace instead */
  collapseNodeModules: boolean;
  collapseStacktrace: boolean;
}

const logConfig: LogConfig = {
  timestamp: true,
  collapseNodeModules: true,
  collapseStacktrace: true,
};

const indent = (msg: string, indentLevel: number): string => {
  if (indentLevel === 0) return msg;
  const indentList: Array<string> = [];
  for (let i = 0; i < indentLevel;) {
    ++i;
    const str = `${i}|`;
    if (i < indentLevel) {
      indentList.push(" ".repeat(str.length));
    } else {
      indentList.push(str);
    }
  }
  const indentStr = indentList.join("");
  return msg.split("\n")
    .map(c => `${indentStr} ${c.trimEnd()}`)
    .join("\n");
};

interface ExtendedErrorFields {
  cause?: Error;
  response?: {
    data?: string | Record<string, unknown>;
  },
  request?: {
    _currentUrl?: string;
  }
  statusCode?: number;
}

type ExtendedError = Error & ExtendedErrorFields;

/** Add context from axios */
const addAxiosContent = (error: ExtendedError): string | undefined => {
  const res: Array<string> = [];
  if (error.request?._currentUrl) {
    res.push(`HTTP Request URL: ${error.request._currentUrl}`);
  }
  if (error.response?.data) {
    res.push("HTTP Response body:");
    if (typeof error.response.data === "string") {
      res.push(error.response.data);
    } else {
      try {
        res.push(JSON.stringify(error.response.data));
      } catch {
        try {
          res.push(error.response.data.toString());
        } catch {
          res.push("<cannot output body>");
        }
      }
    }
  }
  if (res.length === 0) return;
  return res.join("\n");
};

/** Add context from http-errors */
const addHttpErrorContent = (error: ExtendedError): string | undefined => {
  if (error.statusCode === undefined) return;
  return `HttpError status: ${error.statusCode}`;
};

/** Return a string with the full error and stacktrace, including causes */
const filterError = (error: ExtendedError, collapseStacktrace: boolean): string => {
  const resultRows: Array<string> = [];
  let cursor: ExtendedError | undefined = error;
  let indentLevel = 0;
  while (cursor) {
    if (indentLevel === 0) {
      resultRows.push(cursor.name);
    } else {
      resultRows.push(indent(`Caused by: ${cursor.name}`, indentLevel));
    }
    resultRows.push(indent(cursor.message, indentLevel));
    if (cursor.stack) {
      if (collapseStacktrace) {
        resultRows.push(indent([...filterStacktrace(cursor.stack)].join("\n"), indentLevel));
      } else {
        resultRows.push(indent(cursor.stack, indentLevel));
      }
    }
    const axiosContent = addAxiosContent(cursor);
    if (axiosContent) resultRows.push(indent(axiosContent, indentLevel));
    const httpErrorsContent = addHttpErrorContent(cursor);
    if (httpErrorsContent) resultRows.push(indent(httpErrorsContent, indentLevel));
    cursor = cursor.cause;
    ++indentLevel;
  }
  return resultRows.join("\n");
};

const getErrorFromTransformable = (info: TransformableInfo): Error | undefined => {
  if (info instanceof Error) return info;
  if (info.meta) {
    const meta = info.meta as Record<string, unknown>;
    if (meta.error && meta.error instanceof Error) return meta.error;
  }
};

export const customFormat = (
  timestamp?: boolean,
  collapseStacktrace?: boolean,
): Format => winston.format.printf((info: TransformableInfo) => {
  const effectiveTimestamp = timestamp === undefined
    ? logConfig.timestamp
    : timestamp;
  const effectiveCollapse = collapseStacktrace === undefined
    ? logConfig.collapseNodeModules || logConfig.collapseStacktrace
    : collapseStacktrace;
  const error = getErrorFromTransformable(info);
  const message = error ? filterError(error, effectiveCollapse) : info.message;
  return prefixOutput(info.level, message, effectiveTimestamp);
});

/** Edit the configuration applied to consoleLogger */
export const setConfig = (config: LogConfig): void => {
  Object.assign(logConfig, config);
};

export const transports = [new winston.transports.Console()];

export const consoleLogger = winston.createLogger({
  level: "info",
  format: customFormat(),
  transports,
});
