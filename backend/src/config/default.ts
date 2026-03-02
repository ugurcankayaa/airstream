import { Logger, AirStreamModule } from "@airstream/core";

/**
 * Pre-configured logger instance for the backend module
 */
class BackendLogger {
  private logger = Logger.getInstance();
  private module = AirStreamModule.BACKEND;

  debug(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.debug(this.module, message, context, meta);
  }

  info(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.info(this.module, message, context, meta);
  }

  warn(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.warn(this.module, message, context, meta);
  }

  error(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.error(this.module, message, context, meta);
  }
}

export const logger = new BackendLogger();
