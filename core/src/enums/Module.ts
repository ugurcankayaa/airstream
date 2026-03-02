/**
 * Module namings for all the AirStream components
 */
export enum AirStreamModule {
  /**
   * backend service handling WebSocket connections and API endpoints
   */
  BACKEND = "AirStream-Backend",

  /**
   * service running on RPi0 for ADS-B signal decoding and Redis publishing
   */
  ADSB_GATEWAY = "AirStream-ADSB-Gateway",

  /**
   * React UI frontend application
   */
  UI = "AirStream-UI",
}
