/**
 * @module airstream-backend
 * @description backend enables reading signals from the redis channel and forwards to clients over websocket. (i.e. to be used for UI)
 */

import { ISignal } from "@airstream/core";
import { logger } from "./config/default.js";
import { RedisSubscriber } from "./adapters/RedisSubscriber.js";
import { WSServer } from "./adapters/WSServer.js";

// for documentation
export { RedisClient } from "./adapters/RedisClient.js";
export { RedisSubscriber } from "./adapters/RedisSubscriber.js";
export { WSServer } from "./adapters/WSServer.js";
export { WSSignalPublisher } from "./adapters/WSSignalPublisher.js";

async function main() {
  const wsServer = new WSServer();

  const publisher = wsServer.publisher;
  let subscriber: RedisSubscriber | null = null;
  let redisActive = false;

  async function startRedis() {
    if (redisActive) return;
    redisActive = true;

    logger.debug("Starting Redis subscription");

    subscriber = new RedisSubscriber();

    await subscriber.subscribe((signal: ISignal) => {
      publisher.publish(signal);
    });
  }

  async function stopRedis() {
    if (!redisActive) return;
    redisActive = false;

    logger.debug("Stopping Redis subscription");

    if (subscriber) {
      await subscriber.unsubscribe();
      subscriber = null; // IMPORTANT: drop closed instance
    }
  }

  publisher.on("client:connected", async (count: number) => {
    logger.debug(`WS clients: ${count}`);

    if (count !== 1) return;

    try {
      await startRedis();
    } catch (err) {
      redisActive = false;
      subscriber = null;
      logger.error(`Failed to start Redis subscription: ${err}`);
    }
  });

  publisher.on("client:disconnected", async (count: number) => {
    logger.debug(`WS clients: ${count}`);

    if (count !== 0) return;

    try {
      await stopRedis();
    } catch (err) {
      logger.error(`Failed to stop Redis subscription: ${err}`);
    }
  });

  process.stdin.resume();
}

main().catch((err) => {
  logger.error(`Fatal Backend Application Error: ${err}`);
  process.exit(1);
});
