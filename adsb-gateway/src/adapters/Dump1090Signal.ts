import EventEmitter from "events";
import { v4 as uuidv4 } from "uuid";
import { ISignalPayload, ISignal } from "@airstream/core";
import { logger } from "../config/default";
import { config } from "@airstream/core";

type Dump1090_JSON = {
  hex: string;
  flight?: string;
  lat: number;
  lon: number;
  altitude: number;
  track?: number;
  speed?: number;
};

/**
 * Dump1090Signal receives ADS-B  signals from dump1090URL.
 * Emits 'message' events with ISignal objects at poolInterval.
 */
export class Dump1090Signal extends EventEmitter {
  private running = false;
  private url: string = config.adsbGateway.dump1090URL;
  private pollIntervalMs: number;

  constructor(pollIntervalMs = config.adsbGateway.poolInterval) {
    super();
    this.pollIntervalMs = pollIntervalMs;
  }

  start() {
    if (this.running) return;
    this.running = true;

    logger.info(`Dump1090Signal polling ${this.url}`);
    this.pollLoop();
  }

  stop() {
    this.running = false;
    logger.info("Dump1090Signal stopped.");
  }

  private async pollLoop() {
    while (this.running) {
      try {
        const res = await fetch(this.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const aircraft = (await res.json()) as Dump1090_JSON[];
        const now = Date.now();

        for (const a of aircraft) {
          if (
            !a.hex ||
            typeof a.lat !== "number" ||
            typeof a.lon !== "number" ||
            typeof a.altitude !== "number"
          ) {
            continue;
          }

          const payload: ISignalPayload = {
            icao: a.hex.trim().toLowerCase(),
            callsign: (a.flight ?? "").trim() || undefined,
            latitude: a.lat,
            longitude: a.lon,
            altitude: a.altitude,
            heading: a.track,
            speed: a.speed,
            verticalRate: undefined,
            squawk: undefined,
            emergency: undefined,
            lastSeen: now,
            source: "signal_receiver",
          };

          const signal: ISignal = {
            uid: uuidv4(),
            timestamp: now,
            payload,
          };

          this.emit("message", signal);
        }
      } catch (err) {
        logger.error(`Dump1090Signal error: ${err}`);
      }

      await new Promise((r) => setTimeout(r, this.pollIntervalMs));
    }
  }
}
