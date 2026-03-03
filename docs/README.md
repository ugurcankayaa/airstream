# Overview

Scalable real-time flight tracking project using SDR RTL. 
ADSB Gateway publishes live aircraft data to Redis, which is streamed in backend via WebSockets to an interactive React UI for geospatial visualization.

## UI
![Map Visualization](./static/UI_View.png)

## System  

AirStream follows a many-to-one ingestion model:

- Many producers can publish flight messages to one Redis instance (or one Redis stream/channel group).
- The backend consumes from Redis, normalizes data, and broadcasts to connected clients.
- Many frontend clients subscribe through WebSockets and receive the same live feed.


## Flow 

```text
[ADS-B Source 1] --\
[ADS-B Source 2] ----> [Redis] --> [Backend API + WebSocket] --> [React Map Client A]
[ADS-B Source N] --/                                       \--> [React Map Client B]
                                                           \--> [React Map Client N]
```

## Deployment 

```text
+-------------------+      +------------------+      +------------------------+
| Edge / Receiver   | ---> | Redis (buffer)   | ---> | Backend service        |
| (Pi Zero + ADS-B) |      | many->one ingest |      | consume + fan-out WS   |
+-------------------+      +------------------+      +------------------------+
                                                                |
                                                                v
                                                     +-------------------------+
                                                     | Frontend (docs app)     |
                                                     | live map visualization  |
                                                     +-------------------------+
```

## Scalability notes

- **Ingestion:** multiple receivers can publish into Redis at the same time.
- **Backend:** more backend instances can be added behind a load balancer.
- **Client:** one backend stream can fan out to many browser clients.
