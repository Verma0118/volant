# Architecture Diagram

**File:** `Product/architecture.html`
**Purpose:** Shows the full data flow of the Fleet Ops SaaS platform — from aircraft to operator dashboard.

---

## What It Shows

A left-to-right system diagram across 5 layers:

```
Aircraft → Data Ingestion → Core Services → Storage → Operator UI
```

### Layer 1: Aircraft
- **eVTOL fleet** — communicates via ADS-B and OEM APIs, transmitting GPS, battery SOC/SOH, altitude, and speed at 10 Hz
- **Drone fleet** — communicates via MAVLink with Remote ID broadcast (FAA mandated)

### Layer 2: Data Ingestion
- **Data Ingestion** — Socket.io WebSockets + Apache Kafka for high-throughput streaming. Persistent live connections from all active aircraft.
- **API Gateway** — Node.js/Express. Routes all incoming requests. Includes Remote ID compliance layer.

### Layer 3: Core Services
Six services handling the actual intelligence of the platform:
1. **Fleet Map Service** — real-time position overlay via Redis + Socket.io
2. **Mission Dispatch** — aircraft assignment and operator routing via BullMQ + Redis
3. **Deconfliction Engine** — 3D airspace separation, departure holds, route optimization
4. **LAANC Authorization** — automated FAA airspace approval (~1.4s vs 5–10 min manual)
5. **Maintenance Tracker** — battery SOH monitoring, flight-hour-based work orders, ML anomaly alerts
6. **Compliance Log** — FAA Part 135/Part 107 record-keeping, immutable audit trail

### Layer 4: Storage
- **Redis** — live positions and real-time state (pub/sub)
- **PostgreSQL** — structured records: missions, users, logs
- **TimescaleDB** — time-series telemetry: battery history, trend analysis

### Layer 5: Operator
- **Web Dashboard** — React + Mapbox, live fleet map, alerts, dispatch. $200–500/aircraft/month.
- **Mobile App** — React Native, field operator access
- **FAA LAANC API** — external U.S. government API, called directly from the LAANC Authorization service

---

## Design Decisions
- **Kafka in the pipeline** — aviation telemetry is high-frequency (10 Hz × N aircraft). A message queue prevents data loss during load spikes and decouples ingestion from processing.
- **TimescaleDB separate from PostgreSQL** — time-series data (battery cycles, telemetry history) behaves differently from structured records and needs time-based queries. Separate storage optimizes both.
- **Redis for live state** — positions need to be read by every connected operator instantly. Redis pub/sub is the right tool for this, not PostgreSQL.
- **Remote ID compliance at ingestion** — FAA mandates Remote ID broadcast. Handling it at the ingestion layer ensures every aircraft is compliant before data enters the system.

---

## Related
- [[Product/Dashboard Mockup]] — the operator-facing views this architecture supports
- [[Product/Tech Stack Visual]] — interactive scenario walkthrough of the same stack
- [[Research/Founder Learn Sheet]] — Layer-by-layer tech stack reference
