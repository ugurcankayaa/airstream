import { ISignalPublisher, ISignal } from "@airstream/core";
import { RedisClient } from "./RedisClient";

/**
 * RedisSignalPublisher implements ISignalPublisher and publishes signals using RedisClient.
 */
export class RedisSignalPublisher implements ISignalPublisher {
  private redisClient: RedisClient;

  /**
   * Initializes the RedisSignalPublisher with a singleton RedisClient.
   */
  constructor() {
    this.redisClient = RedisClient.getInstance();
  }

  /**
   * Publish a signal via RedisClient to the configured channel.
   * @param {ISignal} signal - The signal to publish
   * @returns {Promise<void>}
   */
  async publish(signal: ISignal): Promise<void> {
    await this.redisClient.publish(this.redisClient.channel, signal);
  }
}
