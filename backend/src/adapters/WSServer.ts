import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WSSignalPublisher } from "./WSSignalPublisher";
import { config } from "@airstream/core";
import { logger } from "../config/default";

/**
 * WSServer
 * Bootstraps and manages the WebSocket transport layer of the backend.
 * - Creates an HTTP server used only for WebSocket
 * - Registers all connected clients into WSSignalPublisher
 * - Forwards published ADS-B signals to connected ws clients
 * - WebSocket runs on root: ws://backend:backend.port
 */
export class WSServer {
  /**
   * HTTP Server is necessary in WS connection upgrades.
   */
  private httpServer: http.Server;
  private wss: WebSocketServer;
  public publisher: WSSignalPublisher;

  constructor() {
    this.httpServer = http.createServer();
    this.wss = new WebSocketServer({
      server: this.httpServer,
    });

    this.publisher = new WSSignalPublisher();
    this.setupListeners();
    this.start();
  }

  /**
   * Setup websocket lifecycle listeners
   */
  private setupListeners(): void {
    this.wss.on("connection", (ws: WebSocket, req) => {
      try {
        logger.info(`WS client connected from ${req.socket.remoteAddress}`);

        this.publisher.registerClient(ws);

        ws.on("close", () => {
          logger.info("WS client disconnected");
        });

        ws.on("error", (err) => {
          logger.warn(`WS Client Error: ${err}`);
        });
      } catch (err) {
        logger.error(`Error during WS connection handling ${err}`);
        ws.close();
      }
    });

    this.wss.on("error", (err) => {
      logger.error(`WS server error ${err}`);
    });
  }

  /**
   * Start listening for WebSocket
   */
  private start(): void {
    this.httpServer.listen(config.backend.port, () => {
      logger.info(
        `WebSocket server running on ws://<backend_host>:${config.backend.port}`,
      );
    });

    this.httpServer.on("error", (err) => {
      logger.error(`HTTP server error ${err}`);
    });
  }
}
