import {NextFunction, Request, Response} from "express";
import {RequestWithLoggingData} from "../logger.js";

export type ExtraLoggingDataType = Record<string, unknown> | undefined;

export type ExtraLoggingDataFunc = (
  req: Request,
) => Promise<ExtraLoggingDataType> | ExtraLoggingDataType;

export type ExtraLoggingData = ExtraLoggingDataFunc | Record<string, unknown>;

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

export const bodyLogger = (
  bodyProps?: Array<string>,
  extraLoggingData?: ExtraLoggingData,
) => (req: Request, res: Response, next: NextFunction): void => {
  const asyncFunc = async () => {
    const extraLogData = typeof extraLoggingData === "function"
      ? await extraLoggingData(req)
      : extraLoggingData;
    setLogInfoInReq(req, bodyProps, extraLogData);
  };
  asyncFunc()
    .then(() => {
      next();
    })
    .catch((error: Error) => {
      next(error);
    });
};
