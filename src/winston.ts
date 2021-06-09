import winston from "winston";

const transports = [new winston.transports.Console()];

const consoleLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports,
});

export default consoleLogger;
