import { BaseRedisClient, ISignal } from "@airstream/core";
import { logger } from "../config/default";

/**
 * Backend Redis client (subscriber-oriented singleton).
 *
 * This concrete client is responsible for subscribe/unsubscribe flows only.
 */
export class RedisClient extends BaseRedisClient {
  /** Singleton instance for backend Redis subscriber access. */
  private static instance?: RedisClient;

  /** Internal Redis "message" listener used to parse and forward signals. */
  private messageHandler?: (ch: string, message: string) => void;

  /** Tracks whether this client is currently subscribed. */
  private subscribed = false;

  /** The currently subscribed channel, if any. */
  private subscribedChannel?: string;

  /** Callback invoked for each parsed signal message. */
  private onSignal?: (signal: ISignal) => void;

  /**
   * Private constructor to enforce singleton usage.
   */
  private constructor() {
    super(logger, "RedisClient");
  }

  /**
   * Get the singleton backend Redis client instance.
   */
  public static getInstance(): RedisClient {
    const current = RedisClient.instance;
    const status = current?.client.status;
    const isClosed = status === "end" || status === "close";

    if (!current || isClosed) {
      RedisClient.instance = new RedisClient();
    }

    return RedisClient.instance!;
  }

  /**
   * Subscribe to a channel and forward valid JSON payloads as `ISignal` objects.
   *
   * @param channel - Redis pub/sub channel to listen to
   * @param callback - signal handler callback
   */
  async subscribe(
    channel: string,
    callback: (signal: ISignal) => void,
  ): Promise<void> {
    this.onSignal = callback;

    if (!this.messageHandler) {
      this.messageHandler = (ch: string, message: string) => {
        if (ch !== this.subscribedChannel) return;
        if (!this.onSignal) return;

        try {
          const signal: ISignal = JSON.parse(message);
          this.onSignal(signal);
        } catch (err) {
          this.logger.warn("Invalid signal JSON from Redis", this.context, {
            channel: ch,
            messagePreview: message?.slice?.(0, 200),
            error: err instanceof Error ? err.message : String(err),
          });
        }
      };

      this.client.on("message", this.messageHandler);
    }

    if (this.subscribed && this.subscribedChannel === channel) {
      this.logger.debug("Already subscribed", this.context, { channel });
      return;
    }

    const count = await this.client.subscribe(channel);
    this.subscribed = true;
    this.subscribedChannel = channel;

    this.logger.debug("Subscribed to Redis channel", this.context, {
      channel,
      count,
    });
  }

  /**
   * Close the Redis client and allow future callers to recreate a fresh singleton.
   */
  async disconnect(): Promise<void> {
    if (RedisClient.instance === this) {
      RedisClient.instance = undefined;
    }

    await super.disconnect();
  }

  /**
   * Unsubscribe from a previously subscribed channel and clean listener state.
   *
   * @param channel - Redis pub/sub channel to stop listening to
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscribed || this.subscribedChannel !== channel) return;

    const status = this.client.status;
    if (status !== "ready" && status !== "connect") {
      this.logger.warn("Redis not connected, skip unsubscribe", this.context, {
        status,
        channel,
      });
      return;
    }

    await this.client.unsubscribe(channel);
    this.subscribed = false;
    this.subscribedChannel = undefined;

    if (this.messageHandler) {
      this.client.off("message", this.messageHandler);
      this.messageHandler = undefined;
    }

    this.onSignal = undefined;

    this.logger.debug("Unsubscribed from Redis channel", this.context, {
      channel,
    });
  }
}
