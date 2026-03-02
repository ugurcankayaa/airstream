import { EventEmitter } from "events";
import { ISignal, ISignalPublisher } from "@airstream/core";
import { WebSocket } from "ws";
import { logger } from "../config/default";

/**
 * Tracks websocket clients and fans out live aircraft updates to each of them.
 *
 * Events emitted by this publisher:
 * - `client:connected`
 * - `client:disconnected`
 * - `clients:count`
 */
export class WSSignalPublisher
  extends EventEmitter
  implements ISignalPublisher
{
  /** Active websocket sessions currently subscribed to updates. */
  private clients = new Set<WebSocket>();

  /**
   * Registers a websocket client and automatically cleans it up on disconnect.
   *
   * @param ws connected websocket session
   */
  registerClient(ws: WebSocket) {
    this.clients.add(ws);
    logger.debug(`WS client connected. total=${this.clients.size}`);
    this.emit("client:connected", this.clients.size);
    this.emit("clients:count", this.clients.size);

    ws.on("close", () => {
      this.clients.delete(ws);
      this.emit("client:disconnected", this.clients.size);
      this.emit("clients:count", this.clients.size);
      logger.debug(`WebSocket Client Removed on Close: ${ws}`);
    });
    ws.on("error", () => {
      this.clients.delete(ws);
      this.emit("clients:count", this.clients.size);
      logger.debug(`WebSocket Client Removed on Error: ${ws}`);
    });
  }

  /**
   * Broadcasts a single signal payload to all open websocket clients.
   *
   * @param signal ADS-B signal to distribute
   */
  async publish(signal: ISignal): Promise<void> {
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(signal));
    }
  }

  /** @returns current number of connected websocket clients. */
  getClientCount(): number {
    return this.clients.size;
  }
}
