import { ISignal } from "./ISignal.js";

/**
 * Contract for a Redis client that handles ADS-B signals
 *
 * Implementations may differ depending on the service:
 * - Backend: only subscribes to receive signals
 * - Signal Collector: only publishes signals to Redis
 */
export interface IRedisClient {
  /**
   * Publish an ADS-B signal to a channel
   * Typically implemented by the RPi publisher
   *
   * @param channel - Redis channel name to publish the signal to
   * @param signal - ADS-B signal object to send
   * @returns Promise that resolves when the message is published
   */
  publish?(channel: string, signal: ISignal): Promise<void>;

  /**
   * Subscribe to a Redis channel and receive incoming ADS-B signals
   * Typically implemented by the backend subscriber
   *
   * @param channel - Redis channel name to subscribe to
   * @param callback - Function called with each received ADS-B signal
   * @returns Promise that resolves when subscription is active
   */
  subscribe?(
    channel: string,
    callback: (signal: ISignal) => void,
  ): Promise<void>;

  /**
   * Unsubscribe from a Redis channel
   *
   * @param channel - Redis channel name to unsubscribe from
   * @returns Promise that resolves when unsubscription is complete
   */
  unsubscribe?(channel: string): Promise<void>;

  /**
   * Disconnect the client from Redis.
   * Should clean up resources and close any open connections.
   *
   * @returns Promise that resolves when disconnection is complete
   */
  disconnect(): Promise<void>;
}
