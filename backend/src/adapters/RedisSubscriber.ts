import { ISignalSubscriber, ISignal } from "@airstream/core";
import { RedisClient } from "./RedisClient";

/**
 * - Subscribes to a configured Redis channel
 * - Forwards incoming ISignal objects to the provided callback
 * - Manages subscription lifecycle (subscribe/unsubscribe)
 */
export class RedisSubscriber implements ISignalSubscriber {
  private activeRedis: RedisClient | null = null;

  async subscribe(callback: (signal: ISignal) => void): Promise<void> {
    const redis = RedisClient.getInstance();
    this.activeRedis = redis;

    await redis.subscribe(redis.channel, callback);
  }

  async unsubscribe(): Promise<void> {
    if (!this.activeRedis) return;

    const redis = this.activeRedis;
    this.activeRedis = null;

    await redis.unsubscribe(redis.channel);
    await redis.disconnect();
  }
}
