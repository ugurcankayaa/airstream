import { AirStreamModule } from "../enums/Module.js";

/**
 * ILogger interface defines the logging contract
 * All logs should include:
 * - level: debug/info/warn/error
 * - module: source module (must use AirStreamModule enum)
 * - message: main log message
 * - context: optional sub-module context (automatically detected from calling file if not provided)
 * - meta: optional data
 */
export interface ILogger {
  debug(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
  info(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
  warn(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
  error(
    module: AirStreamModule,
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
}
