---
date: 2026-04-19
type: plan
status: ready
slice: 1
tags: [build, fleet-overview, mvp]
---

# Build Plan — Slice 1: Fleet Overview

**Objective:** Ship a working Volant Fleet Overview — real-time aircraft positions on a live Mapbox map + Fleet Status table — backed by Redis pub/sub, Socket.io, PostgreSQL, and a realistic telemetry simulator. The output is a prototype you can open in front of Archer Aviation contacts and drone fleet operators and have them say "I need this."

**Success bar (VC investor lens):** A technical evaluator at Archer opens the dashboard, sees 10 aircraft moving in real time over a UAM-relevant city, clicks one and sees its battery at 61% and dropping, and immediately understands what Volant is. No explanation required.

---

## Skills to Activate Per Step

| Step | Skills |
|------|--------|
| 1 — Repo scaffold | `search-first` (research monorepo patterns, Docker Compose setup) |
| 2 — Backend foundation | `search-first` (Express + Redis + Postgres connection patterns) |
| 3 — Simulator | `search-first` (realistic route simulation, MAVLink data schema) |
| 4 — Fleet Map Service | `search-first` (Socket.io + Redis pub/sub patterns) |
| 5 — REST API | (no skill needed — straightforward Express routes) |
| 6 — Frontend scaffold | `search-first` + `ui-ux-pro-max` (Vite setup, dark design system, component architecture) |
| 7 — Nav shell | `ui-ux-pro-max` (sidebar layout, locked states for future slices) |
| 8 — Live Fleet Map | `search-first` + `ui-ux-pro-max` (Mapbox GL JS custom markers, real-time layer updates) |
| 9 — Detail panel | `ui-ux-pro-max` (slide-in panel UX, data display hierarchy) |
| 10 — Fleet Status table | `ui-ux-pro-max` (sortable table, filter pills, live sync) |
| 11 — Demo scenario | `product-lens` (validate scenario tells the right story to operators) |
| 12 — README + setup | (straightforward docs) |

---

## Repo Structure

The platform code lives inside the existing `volant` GitHub repo under `/platform` — vault docs stay at root, code in `/platform`. This keeps one public repo that shows both the research and the working product.

```
volant/                          ← GitHub repo root (existing vault docs)
├── platform/                    ← ALL code lives here
│   ├── docker-compose.yml       ← Redis + PostgreSQL (one command startup)
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.js         ← Express server entrypoint
│   │   │   ├── db.js            ← PostgreSQL connection + queries
│   │   │   ├── redis.js         ← Redis client + pub/sub
│   │   │   ├── socket.js        ← Socket.io server + broadcast logic
│   │   │   ├── routes/
│   │   │   │   └── aircraft.js  ← GET /api/aircraft, GET /api/aircraft/:id
│   │   │   └── services/
│   │   │       └── fleetMap.js  ← Fleet Map Service (Redis → Socket.io)
│   │   ├── simulator/
│   │   │   └── index.js         ← Telemetry simulator (publishes to Redis)
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   ├── design/
│       │   │   └── tokens.js    ← Color constants, fonts, status colors
│       │   ├── components/
│       │   │   ├── Sidebar.jsx
│       │   │   ├── StatusPill.jsx
│       │   │   ├── DetailPanel.jsx
│       │   │   └── BatteryBar.jsx
│       │   ├── views/
│       │   │   ├── FleetMap.jsx      ← Mapbox + live aircraft layer
│       │   │   └── FleetStatus.jsx   ← Sortable table + filters
│       │   └── hooks/
│       │       └── useFleetSocket.js ← Socket.io connection + state sync
│       ├── index.html
│       └── package.json
```

---

## Step 1 — Repo Scaffold + Dev Environment

**Context brief:** Set up the `platform/` directory inside the existing volant repo. Goal is `docker compose up` starting Redis + Postgres, then `npm run dev` in both `backend/` and `frontend/` bringing up the full stack locally. No code logic yet — just skeleton files, working connections, and a health check.

**Activate:** `search-first` — verify best Docker Compose config for Redis 7 + Postgres 15, Vite + React scaffold command, monorepo `package.json` conventions.

**Tasks:**
- [ ] Create `platform/` directory structure (full tree as above, files empty or stubbed)
- [ ] `docker-compose.yml` — Redis 7, Postgres 15, named volumes, exposed ports (6379, 5432)
- [ ] `backend/package.json` — deps: `express`, `pg`, `redis`, `socket.io`, `cors`, `dotenv`
- [ ] `backend/src/index.js` — Express server on port 3001, CORS enabled, `GET /health` → `{ status: "ok" }`
- [ ] `backend/src/db.js` — pg Pool, connect on startup, log success
- [ ] `backend/src/redis.js` — Redis client, connect on startup, log success
- [ ] `frontend/package.json` — Vite + React, deps: `mapbox-gl`, `socket.io-client`
- [ ] `.env.example` — `DATABASE_URL`, `REDIS_URL`, `VITE_MAPBOX_TOKEN`, `PORT`, `DEMO_MODE=false`
- [ ] `docker-compose.yml` — add `healthcheck` for both Redis and Postgres so dependent services wait for ready state
- [ ] `.gitignore` — `node_modules/`, `.env`, `dist/`

**Verification:**
```bash
cd platform && docker compose up -d
cd backend && npm install && npm run dev
# Expect: "PostgreSQL connected", "Redis connected", server on :3001
curl http://localhost:3001/health  # → { status: "ok" }
cd ../frontend && npm install && npm run dev
# Expect: Vite server on :5173, blank React app loads
```

**Exit criteria:** Both servers start clean, health endpoint responds, no connection errors.

---

## Step 1.5 — Auth Stub + Tenancy Schema Decision

**Context brief:** B2B SaaS requires tenancy from day one — adding `operator_id` to `aircraft` after Slice 2 is a painful migration. Slice 1 won't have login UI, but the schema must be multi-tenant from the first migration. Also: pick and wire a migration tool now so schema changes are tracked.

**Tasks:**
- [ ] Choose migration tool: `node-pg-migrate` (lightweight, no ORM lock-in) — add to `backend/package.json`
- [ ] First migration `001_init.sql`: create `operators` table (id, name, created_at) + seed one operator ("Volant Demo Ops")
- [ ] `aircraft` table includes `operator_id UUID REFERENCES operators(id)` — all 10 seeded aircraft belong to the demo operator
- [ ] `CURRENT_OPERATOR_ID` env var — hardcoded to demo operator for Slice 1, replaced by real auth in Slice 2
- [ ] All API routes filter by `CURRENT_OPERATOR_ID` — so the auth layer is a drop-in replacement later, not a rewrite
- [ ] Document decision: auth (JWT + login UI) is Slice 2 — Slice 1 uses env-var operator stub

**Verification:**
```bash
npm run migrate  # → migrations applied
psql $DATABASE_URL -c "\d aircraft"  # → operator_id column present
```

**Exit criteria:** Schema is multi-tenant. No aircraft query touches data without an operator filter.

---

## Step 2 — PostgreSQL Schema + Aircraft Registry

**Context brief:** Define the aircraft table — the authoritative registry of every aircraft in the fleet. This is the source of truth for static aircraft data (tail number, type, operator). Live state (position, battery, status) lives in Redis; static data lives here. Seed with 10 realistic aircraft.

**Tasks:**
- [ ] `backend/src/db.js` — add `initSchema()` function, called on startup
- [ ] Schema — `aircraft` table:
  ```sql
  CREATE TABLE IF NOT EXISTS aircraft (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tail_number VARCHAR(10) UNIQUE NOT NULL,
    type        VARCHAR(20) NOT NULL,  -- 'evtol' | 'drone'
    model       VARCHAR(50),
    operator    VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Seed script — `backend/src/seed.js` — inserts 10 aircraft:
  - 6 drones (DJI M300 type, commercial inspection operators)
  - 4 eVTOL (Midnight-class, air taxi operator)
  - Tail numbers: realistic N-numbers (e.g., `N301VL`, `N302VL` ... `N310VL`)
- [ ] `backend/src/db.js` — add `getAircraft()` and `getAircraftById(id)` query functions

**Verification:**
```bash
node src/seed.js  # → "10 aircraft seeded"
psql $DATABASE_URL -c "SELECT tail_number, type FROM aircraft;"
# → 10 rows
```

**Exit criteria:** 10 aircraft in DB, query functions return correct shape.

---

## Step 3 — Telemetry Simulator

**Context brief:** The simulator is the stand-in for real MAVLink/ADS-B telemetry until hardware is available. It must be realistic enough that a drone operator watching the demo doesn't think "this is fake." Each aircraft follows a real route over Dallas–Fort Worth (a UAM hub and Archer market) with physics-correct battery drain. It publishes to Redis channel `telemetry:update` at 1 Hz. The simulator is a drop-in replacement — the Fleet Map Service doesn't know or care whether it's reading from the simulator or real hardware.

**Why DFW:** Archer's primary US market. Routes over downtown Dallas, DFW airport corridor, and suburb-to-city hops look exactly like eVTOL commercial routes.

**Activate:** `search-first` — research realistic battery drain curves for eVTOL (higher drain on takeoff/landing, ~30% drain rate at cruise for Midnight-class aircraft).

**Tasks:**
- [ ] `simulator/index.js` — reads `DEMO_MODE` env var on startup; if true, loads deterministic scenario (scripted routes, scripted status transitions); if false, generates random routes
- [ ] Design simulator as a drop-in for real MAVLink — identical Redis publish format either way
- [ ] For each aircraft, generate a route: array of [lng, lat] waypoints over DFW corridor
  - eVTOL routes: downtown Dallas ↔ DFW airport corridor (~30km hops)
  - Drone routes: tighter inspection loops over industrial areas
- [ ] Aircraft state machine — each aircraft cycles through statuses realistically:
  - `in-flight` (moving along route, battery draining 0.3–0.5%/sec)
  - `landing` (approaching waypoint, battery drain increases)
  - `charging` (stationary at vertiport, battery climbing 0.8%/sec)
  - `ready` (battery >80%, waiting for next mission)
  - `maintenance` (1 aircraft always in maintenance hold — static)
  - `grounded` (1 aircraft always grounded/fault — static)
- [ ] Battery drain — non-linear: higher drain during takeoff/landing phases, steady at cruise
- [ ] Publish format to Redis `telemetry:update`:
  ```json
  {
    "aircraft_id": "uuid",
    "tail_number": "N301VL",
    "lat": 32.7767,
    "lng": -96.7970,
    "altitude_ft": 1200,
    "speed_kts": 110,
    "heading_deg": 245,
    "battery_pct": 61,
    "status": "in-flight",
    "timestamp": "2026-04-19T14:23:11.000Z"
  }
  ```
- [ ] Demo scenario hardcoded for first run: 3 in-flight (interesting routes), 2 charging at vertiport, 1 maintenance hold, 1 grounded/fault, 3 in holding pattern

**Verification:**
```bash
node simulator/index.js &
redis-cli subscribe telemetry:update
# → JSON messages arriving at ~1/sec per aircraft
# → battery values changing, positions moving
```

**Exit criteria:** 10 aircraft publishing realistic telemetry. Battery drains and climbs correctly. Status transitions happen naturally.

---

## Step 4 — Fleet Map Service (Redis → Socket.io)

**Context brief:** The Fleet Map Service subscribes to `telemetry:update` on Redis, maintains an in-memory current-state cache for all aircraft, and broadcasts updates to every connected frontend client via Socket.io. This is the real-time pipe between the simulator (or future real hardware) and the operator dashboard. Also exposes a `fleet:snapshot` event on client connect so the map populates instantly on load.

**Tasks:**
- [ ] `backend/src/socket.js` — Socket.io server attached to Express HTTP server
- [ ] `backend/src/services/fleetMap.js`:
  - In-memory `fleetState = {}` map (aircraft_id → latest telemetry) — AND mirror to Redis hash `fleet:state` (HSET per aircraft) on every update so state survives service restart
  - Subscribe to Redis `telemetry:update`
  - On each message: update `fleetState[aircraft_id]`, mirror to `fleet:state` hash, emit `aircraft:update` to all Socket.io clients
  - On service startup: hydrate `fleetState` from `fleet:state` Redis hash before accepting Socket.io connections
- [ ] On Socket.io client connect: emit `fleet:snapshot` with full `fleetState` immediately — client arriving mid-flight gets full state, not an empty map until next tick
- [ ] Socket.io events emitted:
  - `fleet:snapshot` → `{ [aircraft_id]: telemetryObject, ... }` (on connect)
  - `aircraft:update` → single telemetry object (on each Redis message)
- [ ] CORS configured to allow `http://localhost:5173`

**Verification:**
```bash
# With simulator running:
node -e "
  const io = require('socket.io-client')('http://localhost:3001');
  io.on('fleet:snapshot', d => console.log('snapshot:', Object.keys(d).length, 'aircraft'));
  io.on('aircraft:update', d => console.log('update:', d.tail_number, d.battery_pct + '%'));
"
# → snapshot: 10 aircraft
# → updates streaming at 1/sec
```

**Exit criteria:** Snapshot delivers all 10 aircraft on connect. Updates stream in real time. No memory leaks on repeated connect/disconnect.

---

## Step 5 — REST API Layer

**Context brief:** REST endpoints for the frontend to fetch static aircraft data and merged fleet state (static DB data + live Redis state). Not the primary data path (Socket.io handles real-time), but needed for the Fleet Status table's initial load and for the detail panel's static fields.

**Tasks:**
- [ ] `backend/src/routes/aircraft.js`:
  - `GET /api/aircraft` — returns all aircraft (DB static fields merged with current Redis state)
  - `GET /api/aircraft/:id` — single aircraft, same merge
- [ ] Merge logic: for each DB row, look up `fleetState[id]` and merge fields
- [ ] Response shape:
  ```json
  {
    "id": "uuid",
    "tail_number": "N301VL",
    "type": "evtol",
    "model": "Midnight",
    "operator": "Archer Aviation",
    "lat": 32.7767,
    "lng": -96.7970,
    "altitude_ft": 1200,
    "speed_kts": 110,
    "battery_pct": 61,
    "status": "in-flight",
    "last_update": "2026-04-19T14:23:11.000Z"
  }
  ```

**Verification:**
```bash
curl http://localhost:3001/api/aircraft | jq '.[0]'
# → full merged object, battery_pct matches simulator output
curl http://localhost:3001/api/aircraft/<uuid> | jq .
```

**Exit criteria:** Both endpoints return correct merged data. No N+1 queries (single DB query + Redis lookup).

---

## Step 6 — Frontend Scaffold + Design System

**Context brief:** The frontend must look like a real product, not a hackathon. Aerospace dark aesthetic: dark navy background, JetBrains Mono for data, Inter for UI text, tight status color system. Everything built from a token file — no hardcoded colors anywhere. This is the foundation every component inherits from. A VC or operator looking at this should feel like they're looking at operational software, not a demo.

**Activate:** `search-first` + `ui-ux-pro-max` — research Vite + React setup, evaluate Tailwind vs custom CSS for this use case (recommendation: custom CSS modules — Tailwind's utility classes look wrong for aerospace data-dense UIs), Mapbox GL JS v3 setup, JetBrains Mono import.

**Tasks:**
- [ ] Vite + React app scaffolded (no TypeScript for speed — can migrate post-hackathon)
- [ ] `src/design/tokens.js`:
  ```js
  export const colors = {
    bg: {
      primary: '#0a0e1a',      // dark navy
      secondary: '#111827',
      panel: '#0f1623',
      border: '#1e2d45',
    },
    status: {
      inflight: '#22c55e',     // green
      charging: '#f59e0b',     // amber
      maintenance: '#3b82f6',  // blue
      grounded: '#ef4444',     // red
      ready: '#6b7280',        // gray
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
      muted: '#475569',
    },
    accent: '#2f7ef5',         // Volant blue
  };
  export const fonts = {
    data: "'JetBrains Mono', monospace",
    ui: "'Inter', sans-serif",
  };
  ```
- [ ] Global CSS: reset, font imports (Google Fonts), body background, scrollbar styling
- [ ] `src/App.jsx` — router (React Router v6): `/` → FleetMap, `/status` → FleetStatus
- [ ] `src/components/StatusPill.jsx` — pill badge with correct color per status
- [ ] `src/components/BatteryBar.jsx` — horizontal bar, color shifts amber <40%, red <20%
- [ ] `src/hooks/useFleetSocket.js` — connects to Socket.io, handles `fleet:snapshot` + `aircraft:update`, returns `fleetState` map; implements reconnection with exponential backoff + re-requests `fleet:snapshot` on reconnect
- [ ] Mapbox token: read from `import.meta.env.VITE_MAPBOX_TOKEN`; if missing, render a clear error state ("Mapbox token not configured") rather than crashing
- [ ] CSS approach: CSS custom properties (`--color-bg-primary` etc.) fed from `tokens.js` on mount — avoids pure custom CSS sprawl while staying framework-free

**Verification:**
```bash
npm run dev
# → App loads, dark navy background, no console errors
# → useFleetSocket hook connected (check Network tab → WS connection)
```

**Exit criteria:** App loads with correct aesthetic. Socket connection established. No color hardcoding anywhere in components.

---

## Step 7 — Sidebar + Navigation Shell

**Context brief:** The sidebar is the product's navigation — it sets the visual language for the full platform. Include all 5 future views but lock Slices 2–5. The locked items communicate roadmap, not absence. Operators and VCs see what's coming.

**Activate:** `ui-ux-pro-max`

**Tasks:**
- [ ] `src/components/Sidebar.jsx`:
  - Top: Volant wordmark (Inter Bold, accent blue)
  - Nav items: Fleet Map, Fleet Status (active), Mission Dispatch (locked), Maintenance (locked), Analytics (locked)
  - Lock icon + muted styling on locked items — no tooltip needed
  - Bottom: live aircraft count with blinking green dot (pulls from `fleetState`)
  - Footer: operator name placeholder ("DFW Air Ops")
- [ ] Layout: 240px fixed sidebar, content area fills rest — flex row, full viewport height
- [ ] Active state: accent left border + slightly brighter label

**Verification:**
- Sidebar renders with correct items, correct lock states
- Active item highlights correctly on route change
- Live aircraft count updates as Socket.io state updates

**Exit criteria:** Sidebar looks production-ready. Navigation works. Live count updates in real time.

---

## Step 8 — Live Fleet Map View

**Context brief:** This is the centerpiece of Slice 1 and the primary demo moment. Mapbox map centered on DFW, aircraft rendered as custom circular markers color-coded by status, positions updating in real time via Socket.io without map flash or jitter. Clicking a marker opens the detail panel. A static restricted airspace overlay (DFW Class B boundary approximate) adds authenticity.

**Activate:** `search-first` + `ui-ux-pro-max` — research Mapbox GL JS v3 custom markers vs GeoJSON layers (recommendation: GeoJSON `circle` layer — performant for 10–100 aircraft, easy to update), smooth position interpolation approach.

**Tasks:**
- [ ] `src/views/FleetMap.jsx`:
  - Mapbox map: style `mapbox://styles/mapbox/dark-v11`, center DFW `[-96.797, 32.776]`, zoom 10
  - GeoJSON source `aircraft-positions` — FeatureCollection, one Feature per aircraft
  - Circle layer with data-driven color: `['get', 'status']` → status color map
  - Circle radius: 8px default, 12px on hover
  - Label layer: tail number below each dot (JetBrains Mono, 11px, white)
  - On `aircraft:update` Socket.io event: update source data (no full re-render)
  - Click on circle → set `selectedAircraft` state → DetailPanel opens
  - Static restricted airspace: `fill` layer, DFW Class B boundary from FAA SUA GeoJSON (source: `https://sua.faa.gov` — download and bundle as static asset; do not call live, no runtime dependency)  — 10% red opacity
  - Top-right overlay: zone status pill ("DFW Class B — Active") and aircraft count

**Interpolation (no jitter):** Between 1 Hz updates, interpolate position linearly so aircraft appear to glide rather than teleport.

**Verification:**
- Map loads with 10 aircraft visible over DFW
- Aircraft move smoothly every second
- Color codes match status (green in-flight, amber charging, red grounded)
- Click → DetailPanel appears
- No console errors on rapid updates

**Exit criteria:** Demo-ready. 60fps on map pan/zoom. Aircraft move visibly. Airspace overlay visible.

---

## Step 9 — Aircraft Detail Panel

**Context brief:** The detail panel is the "moment of understanding" for an operator or demo viewer. They click an aircraft and instantly see everything about it. Must feel snappy — slide in <150ms, no loading state needed (data already in memory from Socket.io). Updates live while panel is open (battery % ticking down in real time).

**Activate:** `ui-ux-pro-max`

**Tasks:**
- [ ] `src/components/DetailPanel.jsx` — slides in from right, 320px width, full height
- [ ] Fields displayed:
  - Header: tail number (large, JetBrains Mono) + StatusPill
  - Battery: BatteryBar component + % (updates live)
  - Altitude: `1,200 ft` (formatted with commas)
  - Speed: `110 kts`
  - Heading: `245°`
  - Position: `32.7767° N, 96.7970° W` (formatted)
  - Type: `eVTOL — Midnight`
  - Operator: `Archer Aviation`
  - Last update: `2 seconds ago` (relative, updates every second)
- [ ] Slide animation: CSS `transform: translateX(100%)` → `translateX(0)`, 150ms ease-out
- [ ] Close: X button top-right, or click outside panel
- [ ] Panel updates live — it reads from `fleetState[selectedId]` which is Socket.io managed

**Verification:**
- Panel opens <150ms
- Battery % updates every ~1 second while panel is open
- All fields present and formatted correctly
- Close works via button and outside click

**Exit criteria:** Feels instant. Live updates visible. No stale data.

---

## Step 10 — Fleet Status Table View

**Context brief:** The table is the ops-center view — when you want to see everything at once rather than on the map. Sortable by any column, filterable by status, live-updating. Row click opens the same DetailPanel. Must sync perfectly with the map — same Socket.io state, same `fleetState` map.

**Activate:** `ui-ux-pro-max`

**Tasks:**
- [ ] `src/views/FleetStatus.jsx`:
  - Filter pills at top: All | In-Flight | Charging | Maintenance | Grounded (count badges on each)
  - Table columns: Tail # | Type | Status | Battery | Altitude | Speed | Location | Last Update
  - Sort: click column header → asc/desc toggle, sort icon
  - Status column: StatusPill component
  - Battery column: BatteryBar (compact, 80px wide) + %
  - Last Update: relative time ("3s ago"), updates every second
  - Rows update live via Socket.io — no full re-render, only changed rows (use `useMemo` + keyed rows)
  - Click row → same DetailPanel as map view
- [ ] Striped rows: alternating `bg.secondary` and `bg.primary`
- [ ] Sticky header

**Verification:**
- Filter pills correctly filter rows, counts update as statuses change
- Sort works on all columns
- Rows update visibly as telemetry comes in (battery % ticking)
- DetailPanel opens on row click
- Table and map always show same state for same aircraft

**Exit criteria:** Table is scannable at a glance. Status changes visible without interaction.

---

## Step 11 — Demo Scenario Hardening

**Context brief:** The simulator's default random behavior needs a hardcoded "golden demo" scenario — a scripted sequence that tells Volant's product story in 3 minutes. A VC or Archer contact watching this demo should see: the problem (mixed fleet states), the solution (real-time visibility), and the value (immediate answer to "where are my aircraft and what state are they in").

**Activate:** `product-lens` — validate the scenario against what a drone fleet operator or Archer contact would find most compelling. The moment that makes them say "I need this."

**Demo scenario script (deterministic):**
```
T+0s    Dashboard opens. 10 aircraft visible over DFW.
        3 in-flight (clear routes, moving visibly)
        2 charging at vertiports (amber, battery climbing)
        2 in-mission on inspection loop (blue)
        1 maintenance hold at hangar (blue, static)
        1 grounded/fault (red, static, flagged)
        1 ready/standby (gray, full battery)

T+30s   N304VL (in-flight) lands. Status: charging. Battery was 18%.
        → Demonstrates the battery-driven status cycle operators care about.

T+60s   N308VL (charging) hits 81%. Status: ready.
        → Available for next dispatch (Slice 2 preview).

T+90s   Click N301VL on map. Detail panel opens.
        Battery: 61% and dropping. Altitude 1,200ft. Speed 110kts.
        → The operator can see everything about this aircraft in 2 seconds.
```

**Tasks:**
- [ ] Add `DEMO_MODE=true` env flag to simulator
- [ ] In demo mode: use deterministic routes (hardcoded waypoints), scripted status transitions at T+30s and T+60s
- [ ] Demo mode routes use real DFW landmarks (DFW airport → downtown Dallas → Love Field → back)
- [ ] `npm run demo` script in root `package.json` — starts full stack in demo mode

**Verification:**
- `npm run demo` brings up full stack
- Scenario plays out as scripted
- All transitions happen on correct timing

**Exit criteria:** Anyone can `npm run demo` and get the full scenario cold.

---

## Step 12 — README + Demo Setup

**Context brief:** The README is the first thing Archer contacts and drone operators see when Aarav shares the repo link. It must communicate what Volant is, why it matters, and how to run it — in that order. Code second, story first.

**Tasks:**
- [ ] `platform/README.md`:
  - H1: "Volant — Fleet Overview (Slice 1)"
  - One-liner: "Real-time fleet operations for drone and eVTOL operators."
  - 3-sentence product context (from the deck)
  - Screenshot (take one once demo is running — add to `platform/assets/`)
  - Quick start:
    ```bash
    cd platform
    cp .env.example .env  # add your Mapbox token
    docker compose up -d
    npm run demo
    # → open http://localhost:5173
    ```
  - What you're seeing (brief: 10 simulated aircraft, DFW routes, live battery drain)
  - What's next: link to MVP Slices.md in vault

**Verification:**
- Cold run: fresh machine, follow README exactly, demo runs in <5 minutes setup

**Exit criteria:** Anyone can follow README cold and have demo running.

---

## Dependency Graph

```
Step 1 (scaffold)
    ↓
Step 2 (DB schema)     Step 6 (frontend scaffold)
    ↓                       ↓
Step 3 (simulator)     Step 7 (nav shell)
    ↓                       ↓
Step 4 (socket svc)    Steps 8, 10 (views — parallel)
    ↓                       ↓
Step 5 (REST API)      Step 9 (detail panel)
    ↓                       ↓
            Step 11 (demo scenario)
                    ↓
            Step 12 (README)
```

**Parallel opportunities:**
- Steps 2–5 (backend) and Steps 6–10 (frontend) can run in parallel once Step 1 is done
- Steps 8 and 10 (Fleet Map + Fleet Status table) are independent — can build in parallel

---

## Invariants (verified after every step)

- No hardcoded colors, coordinates, or aircraft data outside designated files (`tokens.js`, `seed.js`, simulator config)
- `useFleetSocket` is the single source of truth for fleet state on the frontend — no component fetches independently
- All API routes filter by `CURRENT_OPERATOR_ID` — no query is operator-unscoped
- Simulator publishes identical Redis format regardless of `DEMO_MODE` — real MAVLink adapter is a drop-in
- `docker compose down && docker compose up` produces a clean working state (migrations re-apply, seed re-runs)
- Position interpolation lives in `src/utils/interpolate.js` — shared by both FleetMap and FleetStatus, not duplicated
- `VITE_MAPBOX_TOKEN` missing → app renders an error state, does not crash silently
- `fleet:state` Redis hash always mirrors in-memory `fleetState` — service restart recovers in <1s

---

## Rollback Protocol

Each step is a clean git commit. If a step breaks the demo, `git revert` the commit and retry. Steps 1–5 are backend-only; reverting them doesn't affect frontend. Steps 6–10 are frontend-only; reverting them doesn't affect backend services.

---

## Architecture Alignment

This blueprint is Slice 1 of the full 5-slice platform. The authoritative full-system architecture lives in:
- `Product/architecture.html` — all 5 layers, all nodes, slice badges on every component
- `Product/techstack-visual.html` — interactive data-flow scenarios, slice tagged per tab

**Slice 1 footprint in the full architecture:**
- Layer 1 (Aircraft): Drone fleet only — simulated MAVLink. eVTOL real hardware is Slice 2.
- Layer 2 (Ingestion): Socket.io direct. Kafka added in Slice 2 when throughput justifies it.
- Layer 3 (Services): Fleet Map Service only. Dispatch/Deconfliction = Slice 2, Maintenance = Slice 3, LAANC/Compliance = Slice 4.
- Layer 4 (Storage): Redis + PostgreSQL. TimescaleDB added in Slice 3.
- Layer 5 (Operator): Web dashboard — Fleet Map + Fleet Status views only. Mobile app = Slice 2.

Every component built in Slice 1 is production-quality and carries forward — nothing is throwaway.

## Related
[[_BRIEFING]] · [[Product/MVP Slices]] · [[Product/Architecture Diagram]] · [[Product/Dashboard Mockup Notes]] · [[Product/Tech Stack Visual]] · [[Decisions/Hackathon MVP Scope]]
