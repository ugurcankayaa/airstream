/**
 * @module airstream-core
 * @description shared library for configuration, logging, common interfaces.
 */

//logger
export { Logger } from "./logger/Logger.js";
export { ILogger } from "./logger/ILogger.js";

//default configuration
export { config } from "./config/default.js";
export type {
  ICoreConfig,
  LoggingConfig,
  BackendConfig,
  UIConfig,
  IRedisConfig,
  ADSBGatewayConfig,
} from "./config/default.js";

//module names
export { AirStreamModule } from "./enums/Module.js";

//interfaces
export { ISignal, ISignalPayload } from "./interfaces/ISignal.js";
export { ISignalPublisher } from "./interfaces/ISignalPublisher.js";
export { ISignalSubscriber } from "./interfaces/ISignalSubscriber.js";
export { IRedisClient } from "./interfaces/IRedisClient.js";
export { BaseRedisClient } from "./base_classes/BaseRedisClient.js";
export type { IRedisModuleLogger } from "./base_classes/BaseRedisClient.js";
