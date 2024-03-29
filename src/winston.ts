import winston from "winston";
import {Format, TransformableInfo} from "logform";
import {get422Fields} from "./express/unprocessableentityerror.js";

const LOG_LEVEL_PADDING_SIZE = 10;

const stackFilterRegex = /(?:at process|at runMicrotasks)/u;

const isFiltered = (line: string, extraFilter: Array<RegExp> | RegExp | undefined): boolean => {
  if (stackFilterRegex.exec(line)) return true;
  if (extraFilter) {
    for (const filter of Array.isArray(extraFilter) ? extraFilter : [extraFilter]) {
      if (filter.exec(line)) return true;
    }
  }
  return false;
};

/**
 * Collapse useless lines in stacktrace
 */
export const filterStacktrace = function* (
  message: string,
  extraFilter?: Array<RegExp> | RegExp,
): Generator<string> {
  let inCollapse = false;
  const lines = message.split("\n");
  for (const line of lines) {
    if (isFiltered(line, extraFilter)) {
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
  const timestampPrefix = (timestamp ?? (level.toLowerCase() === "error"))
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
  stacktraceFilter?: Array<RegExp> | RegExp;
}

const logConfig: LogConfig = {
  timestamp: true,
  collapseNodeModules: true,
  collapseStacktrace: true,
  stacktraceFilter: undefined,
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
  cause?: unknown;
  response?: {
    data?: string | Record<string, unknown>;
  };
  request?: {
    _currentUrl?: string;
  };
  fields?: Set<string>;
  statusCode?: number;
  expose?: boolean;
}

export type ExtendedError = Error & ExtendedErrorFields;

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
        res.push("<cannot output body>");
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

const getCause = (error: ExtendedError): Error | undefined => {
  const cause = error.cause;
  if (cause === undefined) return;
  if (cause instanceof Error) return cause;
  try {
    return new Error(JSON.stringify(cause));
  } catch {
    return new Error("Unknown cause");
  }
};

/** Handle 422
 *
 * If return a string, do not process the error normally.
 */
const process422Error = (error: ExtendedError): string | undefined => {
  const errorInfo = get422Fields(error);
  return errorInfo?.message;
};

/** Return a string with the full error and stacktrace, including causes */
export const filterError = (
  error: ExtendedError,
  collapseStacktrace = true,
  extraFilter?: Array<RegExp> | RegExp,
): string => {
  const resultRows: Array<string> = [];
  const unprocessableCheck = process422Error(error);
  if (unprocessableCheck) return unprocessableCheck;
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
        resultRows.push(indent([...filterStacktrace(cursor.stack, extraFilter)].join("\n"), indentLevel));
      } else {
        resultRows.push(indent(cursor.stack, indentLevel));
      }
    }
    const axiosContent = addAxiosContent(cursor);
    if (axiosContent) resultRows.push(indent(axiosContent, indentLevel));
    const httpErrorsContent = addHttpErrorContent(cursor);
    if (httpErrorsContent) resultRows.push(indent(httpErrorsContent, indentLevel));
    cursor = getCause(cursor);
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
  stacktraceFilter?: Array<RegExp> | RegExp,
): Format => winston.format.printf((info: TransformableInfo) => {
  const effectiveTimestamp = timestamp ?? logConfig.timestamp;
  const effectiveCollapse = collapseStacktrace
    ?? (logConfig.collapseNodeModules || logConfig.collapseStacktrace);
  const effectiveStacktraceFilter = stacktraceFilter ?? logConfig.stacktraceFilter;
  const error = getErrorFromTransformable(info);
  const message = error
    ? filterError(error, effectiveCollapse, effectiveStacktraceFilter)
    : (info.message as string).toString();
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
