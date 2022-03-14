import {NextFunction, Request, Response} from "express";
import {RequestWithLoggingData} from "../logger.js";

export type ExtraLoggingDataType = Record<string, unknown> | undefined;

export type ExtraLoggingDataFunc = (
  req: Request,
) => Promise<ExtraLoggingDataType> | ExtraLoggingDataType;

export type ExtraLoggingData = ExtraLoggingDataFunc | Record<string, unknown>;

export interface ExtraLoggingOptions {
  /** Do not expose the "hidden" body props */
  noHiddenBodyProps?: boolean;
}

const setLogInfoInReq = (
  req: Request,
  body?: Array<string>,
  extraData?: Record<string, unknown>,
) => {
  const castReq = req as RequestWithLoggingData;
  if (body) {
    if (!castReq._routeWhitelists) castReq._routeWhitelists = {};
    castReq._routeWhitelists.body = body;
  }
  if (extraData) {
    castReq._cleyfayeLogging = {extraLoggingData: extraData};
  }
};

const getPropType = (value: unknown): string => {
  if (typeof value === "string") return `string(${value.length})`;
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "undefined") return "undefined";
  if (Array.isArray(value)) return `Array(${value.length})`;
  return "object";
};

const getHiddenBodyProps = (
  req: Request,
  ignoreKeys: Array<string> = [],
): undefined | Record<string, string> => {
  if (typeof req.body !== "object") return;
  const body = req.body as Record<string, unknown>;
  const res: Record<string, string> = {};
  for (const key of Object.keys(body)) {
    if (ignoreKeys.includes(key)) continue;
    res[key] = getPropType(body[key]);
  }
  if (Object.keys(res).length === 0) return;
  return res;
};

export const bodyLogger = (
  bodyProps?: Array<string>,
  extraLoggingData?: ExtraLoggingData,
  options: ExtraLoggingOptions = {},
) => (req: Request, res: Response, next: NextFunction): void => {
  const asyncFunc = async () => {
    const allExtraData: Record<string, unknown> = {};
    if (!options.noHiddenBodyProps) {
      const redactedBody = getHiddenBodyProps(req, bodyProps);
      if (redactedBody) Object.assign(allExtraData, {redactedBody});
    }
    const extraLogData = typeof extraLoggingData === "function"
      ? await extraLoggingData(req)
      : extraLoggingData;
    Object.assign(allExtraData, extraLogData);
    setLogInfoInReq(req, bodyProps, allExtraData);
  };
  asyncFunc()
    .then(() => {
      next();
    })
    .catch((error: Error) => {
      next(error);
    });
};
