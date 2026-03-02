import { ISignal, ISignalPublisher } from "@airstream/core";
import { ISignalSource } from "../interfaces/ISignalSource";
import { logger } from "../config/default";

/**
 * Connects a signal source to a publisher and handles the flow in between.
 *
 * In production this typically means:
 * 1. read decoded messages from the ADS-B receiver,
 * 2. validate/normalize them upstream,
 * 3. publish the final event to Redis.
 */
export class SignalOrchestrator {
  constructor(
    private signalSource: ISignalSource,
    private publisher: ISignalPublisher,
  ) {}

  /**
   * Starts listening for source events and forwards each signal to the publisher.
   */
  public start = (): void => {
    this.signalSource.on("message", async (signal: ISignal) => {
      try {
        logger.debug("Signal received in orchestrator", "SignalOrchestrator", {
          uid: signal.uid,
          callsign: signal.payload.callsign,
        });
        await this.publisher.publish(signal);
        logger.debug("Signal published successfully", "SignalOrchestrator", {
          signal: signal,
        });
      } catch (err) {
        logger.error(`failed to publish signal: ${err}`);
      }
    });

    this.signalSource.start();
    logger.info("SignalOrchestrator started!");
  };

  /**
   * Stops the source when supported.
   */
  public stop = (): void => {
    if (this.signalSource.stop) {
      this.signalSource.stop();
    }
    logger.info("SignalOrchestrator stopped!");
  };
}
