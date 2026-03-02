/**
 * @module airstream-adsb-gateway
 * @description Entry point for the AirStream ADS-B Gateway service. Handles signal ingestion, publishing, and orchestration.
 */

export type { ISignalSource } from "./interfaces/ISignalSource";
export { SignalOrchestrator } from "./orchestrators/SignalOrchestrator";
export { RedisSignalPublisher } from "./adapters/RedisSignalPublisher";
export { RedisClient } from "./adapters/RedisClient";
export { MockSignal } from "./adapters/MockSignal";
export { Dump1090Signal } from "./adapters/Dump1090Signal";

import { config } from "@airstream/core";
import { logger } from "./config/default";
import { SignalOrchestrator } from "./orchestrators/SignalOrchestrator";
import { RedisSignalPublisher } from "./adapters/RedisSignalPublisher";
import { MockSignal } from "./adapters/MockSignal";
import { Dump1090Signal } from "./adapters/Dump1090Signal";

let signalSource = undefined;

if (config.adsbGateway.mock_signal) {
  logger.info("Using MockSignal for testing");
  signalSource = new MockSignal();
} else {
  logger.info("Using Dump1090");
  signalSource = new Dump1090Signal();
}

const publisher = new RedisSignalPublisher();
const orchestrator = new SignalOrchestrator(signalSource, publisher);

orchestrator.start();
