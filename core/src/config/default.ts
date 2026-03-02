import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
/**
 * shared configuration
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../../.env") });

/**
 * Logging Configuration
 * - level: The minimum level of logs to output (debug, info, warn, error).
 * - fileMaxSize: The maximum size of log files before rotation (e.g., "10m" for 10 megabytes).
 */
export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
  fileMaxSize: string;
  fileMaxFiles: string;
}

/**
 * Backend Configuration
 * - port: The port number on which the backend server will listen.
 */
export interface BackendConfig {
  port: number;
}

/**
 * UI Configuration
 * - port: The port number on which the UI development server will run.
 * - apiBaseUrl: The base URL for API requests from the UI to the backend.
 *  This allows the UI to be configured to point to different backend instances (e.g., local development vs. production).
 */
export interface UIConfig {
  port: number;
  apiBaseUrl: string;
}

/**
 * Redis Configuration
 * - url: The connection URL for the Redis server (e.g., "redis://localhost:6379").
 * - channel: Defined channel for Redis communication
 */
export interface IRedisConfig {
  url: URL;
  channel: string;
}
/**
 * ADS-B Gateway Configuration
 * - mock_signal: Whether to use mock signals for the ADS-B Gateway (useful for testing without real hardware).
 * - dump1090URL: JSON source URL for feeding from dump1090
 * - poolInterval: Pool interval in ms
 */
export interface ADSBGatewayConfig {
  mock_signal: boolean;
  dump1090URL: string;
  poolInterval: number;
}

/**
 * Core Configuration Interface
 * This interface aggregates all the individual configuration sections into a single object that can be imported and used throughout the application.
 */
export interface ICoreConfig {
  logging: LoggingConfig;
  backend: BackendConfig;
  ui: UIConfig;
  redis: IRedisConfig;
  adsbGateway: ADSBGatewayConfig;
}

export const config: ICoreConfig = {
  logging: {
    level: (process.env.LOG_LEVEL as LoggingConfig["level"]) || "info",
    fileMaxSize: process.env.LOG_FILE_MAX_SIZE || "10m",
    fileMaxFiles: process.env.LOG_FILE_MAX_FILES || "14d",
  },
  backend: {
    port: Number(process.env.BACKEND_PORT) || 3000,
  },
  ui: {
    port: Number(process.env.UI_PORT) || 5173,
    apiBaseUrl: process.env.UI_API_BASE_URL || "http://localhost:3000",
  },
  redis: {
    url: new URL(process.env.REDIS_URL || "redis://localhost:6379"),
    channel: process.env.REDIS_CHANNEL || "airstream",
  },
  adsbGateway: {
    mock_signal:
      process.env.ADSB_GATEWAY_MOCK_SIGNAL?.toLowerCase() === "true" || false,
    dump1090URL:
      String(process.env.ADSB_GATEWAY_DUMP1090_URL) ||
      "http://host.docker.internal:8080/data.json",
    poolInterval: Number(process.env.ADSB_GATEWAY_POOL_INTERVAL) || 5000,
  },
};
