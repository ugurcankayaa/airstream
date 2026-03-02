import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ISignal } from "@airstream/core";

const FLIGHT_SOURCE_ID = "flights";
const FLIGHT_ICON_IMAGE_ID = "flight-icon";
const FLIGHT_SYMBOL_LAYER_ID = "flight-symbols";
const FLIGHT_LABEL_LAYER_ID = "flight-labels";
const FLIGHT_TIMEOUT_MS = 15_000;
const USER_SOURCE_ID = "user-location";
const USER_LAYER_ID = "user-location-point";
const USER_LABEL_LAYER_ID = "user-location-label";
const CITY_SOURCE_ID = "city-labels";
const CITY_LAYER_ID = "city-labels-layer";

type SignalMessage = Partial<ISignal>;

type Flight = {
  icao: string;
  callsign?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  verticalRate?: number;
  squawk?: string;
  emergency?: boolean;
  source?: string;
  lastSeen: number;
};

type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

function haversineKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function createFlightIcon(): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");
  if (!ctx) return new ImageData(64, 64);

  ctx.translate(32, 32);

  ctx.fillStyle = "#00E5FF";
  ctx.strokeStyle = "#042538";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(7, -6);
  ctx.lineTo(22, -2);
  ctx.lineTo(22, 5);
  ctx.lineTo(7, 5);
  ctx.lineTo(3, 23);
  ctx.lineTo(10, 23);
  ctx.lineTo(10, 28);
  ctx.lineTo(0, 28);
  ctx.lineTo(-10, 28);
  ctx.lineTo(-10, 23);
  ctx.lineTo(-3, 23);
  ctx.lineTo(-7, 5);
  ctx.lineTo(-22, 5);
  ctx.lineTo(-22, -2);
  ctx.lineTo(-7, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function formatLastSeen(timestampMs: number): string {
  return `${new Date(timestampMs).toLocaleTimeString()} (${Math.floor((Date.now() - timestampMs) / 1000)}s ago)`;
}

function popupHtml(flight: Flight): string {
  const callsign = flight.callsign ?? "Unknown";
  return `
    <div style="min-width: 220px; font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.35;">
      <div style="font-weight: 700; margin-bottom: 6px; font-size: 13px;">${callsign}</div>
      <div><b>ICAO:</b> ${flight.icao}</div>
      <div><b>Position:</b> ${flight.latitude.toFixed(4)}, ${flight.longitude.toFixed(4)}</div>
      <div><b>Altitude:</b> ${Math.round(flight.altitude ?? 0)} ft</div>
      <div><b>Heading:</b> ${Math.round(flight.heading ?? 0)}°</div>
      <div><b>Speed:</b> ${Math.round(flight.speed ?? 0)} kt</div>
      <div><b>Vertical rate:</b> ${Math.round(flight.verticalRate ?? 0)} ft/min</div>
      <div><b>Squawk:</b> ${flight.squawk ?? "N/A"}</div>
      <div><b>Emergency:</b> ${flight.emergency ? "YES" : "No"}</div>
      <div><b>Source:</b> ${flight.source ?? "N/A"}</div>
      <div style="margin-top: 6px;"><b>Latest update:</b> ${formatLastSeen(flight.lastSeen)}</div>
    </div>
  `;
}

export default function MapView() {
  const [wsConnected, setWsConnected] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(() =>
    typeof navigator !== "undefined" && !navigator.geolocation
      ? "Geolocation is not supported by your browser."
      : null,
  );
  const [maxTrackedDistanceKm, setMaxTrackedDistanceKm] = useState(0);
  const [activeFlights, setActiveFlights] = useState(0);

  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const flightsRef = useRef<Map<string, Flight>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const selectedIcaoRef = useRef<string | null>(null);
  const maxTrackedDistanceRef = useRef(0);
  const userLocationRef = useRef<UserLocation | null>(null);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;

    const heidelberg: [number, number] = [8.6821, 49.4064];

    const style: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        sat: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "Tiles © Esri",
        },
      },
      layers: [{ id: "satellite", type: "raster", source: "sat" }],
    };

    const map = new maplibregl.Map({
      container: elRef.current,
      style,
      center: heidelberg,
      zoom: 7,
    });

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const configuredWsUrl = import.meta.env.VITE_UI_API_BASE_URL as string | undefined;
    const wsUrl = configuredWsUrl ?? `${wsProtocol}//${window.location.hostname}:3000`;

    const playAlarmSound = () => {
      try {
        const audioContext = new window.AudioContext();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.05;

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
        oscillator.onended = () => {
          audioContext.close().catch(() => undefined);
        };
      } catch {
        // no-op: audio may be blocked until user interaction
      }
    };

    const triggerNewFlightAlarm = () => {
      playAlarmSound();
    };

    const updatePopup = () => {
      const selectedIcao = selectedIcaoRef.current;
      if (!selectedIcao || !popupRef.current) return;

      const selectedFlight = flightsRef.current.get(selectedIcao);
      if (!selectedFlight) {
        popupRef.current.remove();
        popupRef.current = null;
        selectedIcaoRef.current = null;
        return;
      }

      popupRef.current
        .setLngLat([selectedFlight.longitude, selectedFlight.latitude])
        .setHTML(popupHtml(selectedFlight));
    };

    const updateUserLocationOnMap = (location: UserLocation) => {
      const source = map.getSource(USER_SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;

      source.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [location.longitude, location.latitude],
            },
            properties: { label: "Client" },
          },
        ],
      });
    };

    const updateMapFlights = () => {
      const source = map.getSource(FLIGHT_SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;

      const now = Date.now();
      const features = [...flightsRef.current.values()]
        .filter((flight) => now - flight.lastSeen <= FLIGHT_TIMEOUT_MS)
        .map((flight) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [flight.longitude, flight.latitude],
          },
          properties: {
            icao: flight.icao,
            callsign: flight.callsign ?? flight.icao,
            altitude: flight.altitude ?? 0,
            heading: flight.heading ?? 0,
          },
        }));

      source.setData({
        type: "FeatureCollection",
        features,
      });

      setActiveFlights(features.length);

      updatePopup();
    };

    const updateMaxTrackedDistance = (flight: Flight) => {
      const currentLocation = userLocationRef.current;
      if (!currentLocation) return;

      const distanceKm = haversineKm(
        currentLocation.latitude,
        currentLocation.longitude,
        flight.latitude,
        flight.longitude,
      );

      if (distanceKm > maxTrackedDistanceRef.current) {
        maxTrackedDistanceRef.current = distanceKm;
        setMaxTrackedDistanceKm(distanceKm);
      }
    };

    const onFlightClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const icao = feature?.properties?.icao;

      if (typeof icao !== "string") return;

      const flight = flightsRef.current.get(icao);
      if (!flight) return;

      selectedIcaoRef.current = flight.icao;

      if (!popupRef.current) {
        popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: false });
        popupRef.current.on("close", () => {
          selectedIcaoRef.current = null;
          popupRef.current = null;
        });
      }

      popupRef.current
        .setLngLat([flight.longitude, flight.latitude])
        .setHTML(popupHtml(flight))
        .addTo(map);
    };

    map.on("load", () => {
      if (!map.hasImage(FLIGHT_ICON_IMAGE_ID)) {
        map.addImage(FLIGHT_ICON_IMAGE_ID, createFlightIcon());
      }

      map.addSource(FLIGHT_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: FLIGHT_SYMBOL_LAYER_ID,
        type: "symbol",
        source: FLIGHT_SOURCE_ID,
        layout: {
          "icon-image": FLIGHT_ICON_IMAGE_ID,
          "icon-size": 0.5,
          "icon-allow-overlap": true,
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
        },
      });

      map.addLayer({
        id: FLIGHT_LABEL_LAYER_ID,
        type: "symbol",
        source: FLIGHT_SOURCE_ID,
        layout: {
          "text-field": ["get", "callsign"],
          "text-size": 12,
          "text-anchor": "top",
          "text-offset": [0, 1.3],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#001B2E",
          "text-halo-width": 1,
        },
      });

      map.addSource(USER_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: USER_LAYER_ID,
        type: "circle",
        source: USER_SOURCE_ID,
        paint: {
          "circle-radius": 7,
          "circle-color": "#ff3d00",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: USER_LABEL_LAYER_ID,
        type: "symbol",
        source: USER_SOURCE_ID,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#001B2E",
          "text-halo-width": 1,
        },
      });

      map.addSource(CITY_SOURCE_ID, {
        type: "vector",
        url: "https://demotiles.maplibre.org/tiles/tiles.json",
      });

      map.addLayer({
        id: CITY_LAYER_ID,
        type: "symbol",
        source: CITY_SOURCE_ID,
        "source-layer": "place",
        minzoom: 3,
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 8, 16],
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      });

      map.on("click", FLIGHT_SYMBOL_LAYER_ID, onFlightClick);

      map.on("mouseenter", FLIGHT_SYMBOL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", FLIGHT_SYMBOL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      updateMapFlights();
    });

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const signal = JSON.parse(event.data as string) as SignalMessage;
        const payload = signal.payload;

        if (!payload?.icao) return;
        if (typeof payload.latitude !== "number" || typeof payload.longitude !== "number") return;

        const lastSeen = Math.max(payload.lastSeen ?? 0, signal.timestamp ?? 0, Date.now());

        const isNewFlight = !flightsRef.current.has(payload.icao);

        flightsRef.current.set(payload.icao, {
          icao: payload.icao,
          callsign: payload.callsign,
          latitude: payload.latitude,
          longitude: payload.longitude,
          altitude: payload.altitude,
          heading: payload.heading,
          speed: payload.speed,
          verticalRate: payload.verticalRate,
          squawk: payload.squawk,
          emergency: payload.emergency,
          source: payload.source,
          lastSeen,
        });

        const flight = flightsRef.current.get(payload.icao);
        if (flight) {
          if (isNewFlight) {
            triggerNewFlightAlarm();
          }
          updateMaxTrackedDistance(flight);
        }

        updateMapFlights();
      } catch (error) {
        console.error("Failed to parse websocket signal", error);
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error", event);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("error", (e) => console.error("MapLibre error:", e?.error || e));

    const pruneInterval = window.setInterval(() => {
      let hasExpired = false;
      const now = Date.now();

      for (const [icao, flight] of flightsRef.current) {
        if (now - flight.lastSeen > FLIGHT_TIMEOUT_MS) {
          flightsRef.current.delete(icao);
          hasExpired = true;
        }
      }

      if (hasExpired) {
        updateMapFlights();
      }
    }, 1000);

    mapRef.current = map;

    let locationWatchId: number | null = null;
    if (navigator.geolocation) {
      locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          setUserLocation(location);
          setLocationError(null);
          updateUserLocationOnMap(location);

          if (map.getZoom() <= 7) {
            map.flyTo({ center: [location.longitude, location.latitude], zoom: 9 });
          }
        },
        (error) => {
          setLocationError(error.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
        },
      );
    }

    return () => {
      window.clearInterval(pruneInterval);
      map.off("click", FLIGHT_SYMBOL_LAYER_ID, onFlightClick);
      popupRef.current?.remove();
      popupRef.current = null;
      selectedIcaoRef.current = null;
      ws.close();
      setWsConnected(false);
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={elRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 2,
          background: "rgba(0, 17, 27, 0.82)",
          color: "#fff",
          padding: "10px 12px",
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.4,
          minWidth: 280,
          border: "1px solid rgba(0, 229, 255, 0.4)",
        }}
      >
        <div>
          <strong>WebSocket:</strong> {wsConnected ? "Connected" : "Disconnected"}
        </div>
        <div>
          <strong>Active flights:</strong> {activeFlights}
        </div>
        <div>
          <strong>Your location:</strong>{" "}
          {userLocation
            ? `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)} (±${Math.round(userLocation.accuracy)}m)`
            : locationError ?? "Locating..."}
        </div>
        <div>
          <strong>Furthest tracked range (ever):</strong> {maxTrackedDistanceKm.toFixed(2)} km
        </div>
      </div>
    </div>
  );
}
