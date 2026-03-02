import { ISignal } from "./ISignal.js";
/**
 * Contract for any service that subscribes to ADS-B signals (e.g., backend).
 */
export interface ISignalSubscriber {
  /**
   * Subscribe to signals and receive them via callback.
   * @param callback - Function called with each received ADS-B signal
   */
  subscribe(callback: (signal: ISignal) => void): Promise<void>;

  /** Stop the subscription and close connection */
  unsubscribe(): Promise<void>;
}
