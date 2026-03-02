import { BaseRedisClient, ISignal } from "@airstream/core";
import { logger } from "../config/default";

/**
 * ADS-B gateway Redis client (publisher-oriented singleton).
 *
 * This concrete client is responsible for publish flow only.
 */
export class RedisClient extends BaseRedisClient {
  /** Singleton instance for ADS-B gateway Redis publishing access. */
  private static instance: RedisClient;

  /**
   * Private constructor to enforce singleton usage.
   */
  private constructor() {
    super(logger, "RedisClient");
  }

  /**
   * Get the singleton ADS-B gateway Redis client instance.
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Publish an ADS-B signal to Redis.
   *
   * @param channel - Redis channel to publish into (defaults to configured channel)
   * @param signal - ADS-B signal payload
   */
  async publish(
    channel: string = this.channel,
    signal: ISignal,
  ): Promise<void> {
    try {
      const payload = JSON.stringify(signal);
      const subscriberCount = await this.client.publish(channel, payload);
      this.logger.debug("Published to Redis", this.context, {
        channel,
        signalUid: signal.uid,
        callsign: signal.payload.callsign,
        subscriberCount,
      });
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error("Redis publish error", this.context, {
          channel,
          message: err.message,
          stack: err.stack,
          signalUid: signal.uid,
        });
      } else {
        this.logger.error(
          `redis publish error on channel ${channel}: ${String(err)}`,
        );
      }
    }
  }
}
