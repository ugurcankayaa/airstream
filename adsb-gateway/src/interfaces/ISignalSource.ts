import EventEmitter from "events";

/**
 * Contract for a signal source (ADS-B receiver or mock API)
 * Must emit 'message' events carrying ISignal objects
 */
export interface ISignalSource extends EventEmitter {
  /** Start producing signals */
  start(): void;

  /** Stop producing signals */
  stop?(): void;
}
