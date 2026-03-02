import EventEmitter from "events";
import { v4 as uuidv4 } from "uuid";
import { ISignalPayload, ISignal } from "@airstream/core";
import { logger } from "../config/default";

/**
 * MockSignal generates random ADS-B-like signals for testing.
 * Emits 'message' events with ISignal objects at a configurable interval.
 */
export class MockSignal extends EventEmitter {
  private running = false;
  private pollIntervalMs: number;

  /**
   * @param {number} pollIntervalMs - Interval in milliseconds between generated signals (default: 5000)
   */
  constructor(pollIntervalMs = 5000) {
    super();
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Start generating and emitting mock signals.
   */
  start() {
    this.running = true;
    logger.info("MockSignal start generating.");
    this.generateLoop();
  }

  /**
   * Internal loop to generate and emit signals at the configured interval.
   * @private
   */
  private async generateLoop() {
    while (this.running) {
      try {
        const baseLatitude = 50 + Math.random() * 10; // 50-60°N
        const baseLongitude = 0 + Math.random() * 20; // 0-20°E

        const payload: ISignalPayload = {
          icao: this.randomHex(6),
          callsign: `TEST${Math.floor(Math.random() * 1000)}`,
          latitude: baseLatitude,
          longitude: baseLongitude,
          altitude: 30000 + Math.random() * 10000,
          heading: Math.floor(Math.random() * 360),
          speed: 400 + Math.random() * 200,
          verticalRate: (Math.random() - 0.5) * 2000,
          squawk: this.randomHex(4),
          emergency: false,
          lastSeen: Date.now(),
          source: "mock_signal",
        };

        const signal: ISignal = {
          uid: uuidv4(),
          timestamp: Date.now(),
          payload,
        };

        this.emit("message", signal);
        logger.debug("Mock signal emitted", "MockSignal", {
          callsign: payload.callsign,
          uid: signal.uid,
        });
      } catch (err) {
        logger.error(`Error generating mock signal: ${err}`);
      }

      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
  }

  /**
   * Generate a random hexadecimal string of the given length.
   * @param {number} length
   * @returns {string}
   * @private
   */
  private randomHex(length: number): string {
    return Math.floor(Math.random() * Math.pow(16, length))
      .toString(16)
      .toUpperCase()
      .padStart(length, "0");
  }

  /**
   * Stop generating mock signals.
   */
  stop() {
    this.running = false;
    logger.info("MockSignal stop generating.");
  }
}
