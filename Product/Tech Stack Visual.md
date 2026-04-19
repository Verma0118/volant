# Tech Stack Visual

**File:** `Product/techstack-visual.html`
**Purpose:** Interactive walkthrough of how the tech stack behaves for 4 key operator scenarios — shows the data flow from frontend request to backend response.

---

## What It Shows

A 3-column interactive diagram:
- **Left** — Operator Dashboard (React + Mapbox) — what the operator sees
- **Middle** — animated request/response flow indicator
- **Right** — Backend stack — which layers activate for each scenario

Click a tab to see the full data path light up for that scenario.

---

## The 4 Scenarios

### Fleet Map · GET /positions
Operator opens the dashboard. Frontend requests current aircraft positions.
- Data Ingestion pulls from Kafka stream
- Fleet Map Service reads live positions from Redis
- WebSocket pushes positions to Mapbox map in real time
- Result: live aircraft dots appear on map

### Mission Dispatch · POST /assign
Operator assigns an aircraft to a mission.
- Request hits API Gateway
- Mission Dispatch service validates aircraft availability (battery level, location, airspace)
- BullMQ queues the dispatch job
- Deconfliction Engine checks for airspace conflicts
- Result: aircraft assigned, mission created, ops team notified

### Deconfliction · Auto-detect
System detects two aircraft on a collision course or airspace conflict.
- No operator action needed — triggered automatically
- 3D routing algorithm recalculates separation
- Affected aircraft receive new routing instructions
- Departure hold issued if necessary
- Result: conflict resolved before it becomes an incident

### LAANC Auth · FAA API
Operator requests airspace authorization for an upcoming mission.
- LAANC Authorization service calls FAA API directly
- Authorization returned in ~1.4 seconds (vs 5–10 min manual paperwork)
- Authorization logged in Compliance Log automatically
- Result: airspace cleared, mission can proceed

---

## Tech Stack (full reference in [[Research/Founder Learn Sheet]])

| Layer | Tech |
|-------|------|
| Frontend | React + Mapbox (3D airspace), React Native (mobile) |
| API | Node.js + Express |
| Message Queue | Apache Kafka (high-throughput telemetry streaming) |
| Orchestration | BullMQ + Redis |
| Live State | Redis pub/sub |
| Structured Data | PostgreSQL |
| Time-series | TimescaleDB (battery history, telemetry trends) |
| Cloud | AWS (GovCloud for security compliance) |
| Telemetry Protocols | MAVLink (drones), ADS-B + OEM API (eVTOL) |
| Compliance | Remote ID layer, FAA LAANC API, immutable audit trail |

---

## Related
- [[Product/Architecture Diagram]] — the same stack shown as a system architecture diagram
- [[Product/Dashboard Mockup Notes]] — the operator interface these flows power
- [[Research/Founder Learn Sheet]] — MVP stack: build fleet map, flight logging, maintenance tracking, LAANC first
