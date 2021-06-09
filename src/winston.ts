import winston from "winston";

export const transports = [new winston.transports.Console()];

export const consoleLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports,
});
