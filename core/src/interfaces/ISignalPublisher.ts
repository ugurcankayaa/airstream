import { ISignal } from "./ISignal.js";
/**
 * Contract for any service that publishes ADS-B signals (e.g., RPi).
 */
export interface ISignalPublisher {
  /**
   * Publish a signal to the messaging system (e.g., Redis).
   * @param signal - ADS-B signal
   */
  publish(signal: ISignal): Promise<void>;
}
