type LogMeta = Record<string, unknown>;

class UILogger {
  debug(message: string, context?: string, meta?: LogMeta): void {
    console.debug(`[UI][DEBUG] ${context ?? "App"}: ${message}`, meta ?? {});
  }

  info(message: string, context?: string, meta?: LogMeta): void {
    console.info(`[UI][INFO] ${context ?? "App"}: ${message}`, meta ?? {});
  }

  warn(message: string, context?: string, meta?: LogMeta): void {
    console.warn(`[UI][WARN] ${context ?? "App"}: ${message}`, meta ?? {});
  }

  error(message: string, context?: string, meta?: LogMeta): void {
    console.error(`[UI][ERROR] ${context ?? "App"}: ${message}`, meta ?? {});
  }
}

export const logger = new UILogger();
