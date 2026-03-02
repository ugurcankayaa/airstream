import { Redis as RedisInstance } from "ioredis";
import { config } from "../config/default.js";
import { IRedisClient } from "../interfaces/IRedisClient.js";

export interface IRedisModuleLogger {
  debug(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
  info(message: string, context?: string, meta?: Record<string, unknown>): void;
  warn(message: string, context?: string, meta?: Record<string, unknown>): void;
  error(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
}

/**
 * Shared Redis plumbing used by module-specific clients.
 *
 * The goal of this base class is to keep retry policy, lifecycle logging,
 * and configuration loading in one place so each service can focus on its
 * own publish/subscribe behavior.
 */
export abstract class BaseRedisClient implements IRedisClient {
  /** Singleton-safe Redis connection used by subclasses. */
  protected readonly client: RedisInstance;

  /** Module logger implementation injected by the subclass. */
  protected readonly logger: IRedisModuleLogger;

  /** Logical context string used in log records (e.g. "RedisClient"). */
  protected readonly context: string;

  /** Redis host from shared configuration. */
  protected readonly host: string = config.redis.url.hostname;

  /** Redis port from shared configuration. */
  protected readonly port: number = Number(config.redis.url.port);

  /** Default pub/sub channel from shared configuration. */
  public readonly channel: string = config.redis.channel;

  /**
   * Creates a ready-to-use Redis client and wires operational events.
   *
   * @param logger module logger wrapper used for lifecycle and error logs
   * @param context short log label to identify the concrete adapter instance
   */
  protected constructor(logger: IRedisModuleLogger, context = "RedisClient") {
    this.logger = logger;
    this.context = context;
    this.client = new RedisInstance(this.port, this.host, {
      keepAlive: 10000,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });

    this.client.on("connect", () =>
      this.logger.info("redis client connected!"),
    );

    this.client.on("error", (err: unknown) => {
      if (err instanceof Error) {
        this.logger.error("Redis client error", this.context, {
          message: err.message,
          stack: err.stack,
          host: this.host,
          redisPort: this.port,
        });
        return;
      }

      this.logger.error("Redis client error", this.context, {
        host: this.host,
        redisPort: this.port,
        rawError: String(err),
      });
    });

    this.client.on("close", () => {
      this.logger.warn("Redis connection closed", this.context);
    });

    this.client.on("reconnecting", (delay: number) => {
      this.logger.info("Redis reconnecting", this.context, { delayMs: delay });
    });

    this.client.on("end", () => {
      this.logger.info("Redis connection ended", this.context);
    });
  }

  /**
   * Closes the Redis connection gracefully.
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
    this.logger.info("redis client disconnected!");
  }
}
