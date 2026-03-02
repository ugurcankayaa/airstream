import {
  createLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";
import "winston-daily-rotate-file";
import { ILogger } from "./ILogger.js";
import { config } from "../config/default.js";
import { AirStreamModule } from "../enums/Module.js";
import path from "path";

export class Logger implements ILogger {
  private static instance: Logger;
  private logger: WinstonLogger;
  private logLevel: string;

  private constructor() {
    const { level, fileMaxSize, fileMaxFiles } = config.logging;
    this.logLevel = level;

    const fileTransport = new transports.DailyRotateFile({
      filename: path.join(process.cwd(), "../logs/Airstream_Log-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxSize: fileMaxSize,
      maxFiles: fileMaxFiles,
      level: this.logLevel,
    });

    this.logger = createLogger({
      level: this.logLevel,
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(({ message }: { message: unknown }) => String(message)),
      ),
      transports: [
        new transports.Console({ level: this.logLevel }),
        fileTransport,
      ],
    });
  }
  //singleton getter
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Extract calling file name from stack trace
   */
  private getCallerContext(): string {
    const stack = new Error().stack;
    if (!stack) return "unknown";

    const lines = stack.split("\n");
    // Skip Error, getCallerContext, formatMessage, and the log method itself
    const callerLine = lines[4];
    if (!callerLine) return "unknown";

    // Extract file name from stack trace
    const match =
      callerLine.match(/\((.+?):(\d+):(\d+)\)/) ||
      callerLine.match(/at (.+?):(\d+):(\d+)/);
    if (match) {
      const fullPath = match[1];
      return path.basename(fullPath);
    }

    return "unknown";
  }

  private formatMessage(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): string {
    const actualContext = context || this.getCallerContext();
    const contextStr = actualContext ? `:${actualContext}` : "";
    const metaStr = meta ? ` | meta: ${JSON.stringify(meta)}` : "";
    const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
    return `${timestamp} [${module}${contextStr}] [${this.logLevel.toUpperCase()}] ${message}${metaStr}`;
  }

  /**
   * Log a debug message
   * @param module - Module name (use AirStreamModule enum)
   * @param message - Log message
   * @param context - Optional context (automatically detected from file if not provided)
   * @param meta - Optional metadata object
   */
  public debug(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.debug(this.formatMessage(module, message, context, meta));
  }

  /**
   * Log an info message
   * @param module - Module name (use AirStreamModule enum)
   * @param message - Log message
   * @param context - Optional context (automatically detected from file if not provided)
   * @param meta - Optional metadata object
   */
  public info(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.info(this.formatMessage(module, message, context, meta));
  }

  /**
   * Log a warning message
   * @param module - Module name (use AirStreamModule enum)
   * @param message - Log message
   * @param context - Optional context (automatically detected from file if not provided)
   * @param meta - Optional metadata object
   */
  public warn(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.warn(this.formatMessage(module, message, context, meta));
  }

  /**
   * Log an error message
   * @param module - Module name (use AirStreamModule enum)
   * @param message - Log message
   * @param context - Optional context (automatically detected from file if not provided)
   * @param meta - Optional metadata object
   */
  public error(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.error(this.formatMessage(module, message, context, meta));
  }
}
