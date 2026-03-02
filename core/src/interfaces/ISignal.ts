/**
 * Normalized aircraft telemetry attached to every signal in the system.
 *
 * The gateway receives data from different sources (real receiver or mock feed),
 * then maps all of them to this shared shape so downstream services can stay
 * source-agnostic.
 */
export interface ISignalPayload {
  /** Aircraft ICAO address (hex string) */
  icao: string;

  /** Flight callsign (if available) */
  callsign?: string;

  /** Latitude in degrees */
  latitude: number;

  /** Longitude in degrees */
  longitude: number;

  /** Altitude in feet */
  altitude: number;

  /** Heading in degrees from North (optional) */
  heading?: number;

  /** Ground speed in knots (optional) */
  speed?: number;

  /** Vertical rate in feet per minute (optional) */
  verticalRate?: number;

  /** Transponder code (optional) */
  squawk?: string;

  /** True if emergency squawk or alert */
  emergency?: boolean;

  /** Timestamp (Unix epoch in ms) */
  lastSeen: number;

  /** Source of the signal */
  source: "signal_receiver" | "mock_signal";
}

/**
 * Envelope used when moving aircraft telemetry between services.
 *
 * Think of this as the canonical event contract between the gateway,
 * Redis, and websocket broadcaster.
 */
export interface ISignal {
  /** Unique signal UUID */
  uid: string;

  /** Epoch timestamp in milliseconds */
  timestamp: number;

  /** Payload containing the ADS-B signal data */
  payload: ISignalPayload;
}
