---
date: 2026-04-26
type: plan
status: active
slice: 2
tags: [build, mission-dispatch, mvp]
---

# Build Plan — Slice 2: Mission Dispatch

**Objective:** Give operators the ability to *act*, not just observe. An operator creates a mission (origin → destination, cargo type, priority), the system assigns the best available aircraft, runs an automatic deconfliction check against active flights, and the mission executes — visible live on the Fleet Map. Slice 1 was visibility. Slice 2 is control.

**Success bar (VC investor lens):** An operator opens the dashboard, clicks "New Mission," fills in two fields, hits Dispatch — and in 2 seconds the system assigns an aircraft, draws the route on the map, and says "No conflicts detected." That sequence, cold, in under 10 seconds. No explanation required.

**Carries forward from Slice 1:**
- Redis + PostgreSQL + Socket.io stack (unchanged)
- `authStub` middleware → replaced by real JWT in Step 5
- `fleetState` in-memory map → Mission Dispatch reads it for aircraft availability
- Simulator status machine → selected aircraft transitions to `in-flight` via mission assignment

---

## Architecture Added in Slice 2

```
Operator Dashboard
      │
      ▼
POST /api/missions          ← new: dispatch API
      │
      ▼
Assignment Engine           ← new: picks best aircraft
      │
      ▼
Deconfliction Service       ← new: spatial/temporal conflict check
      │
      ▼
BullMQ Job Queue            ← new: mission state machine worker
      │
      ├─ Redis (jobs + fleet:state already there)
      │
      ▼
Socket.io → aircraft:update ← existing: simulator override when mission assigned
      │
      ▼
Fleet Map overlay           ← new: active mission route drawn on map
```

---

## DB Schema Additions

```sql
-- missions table
CREATE TABLE missions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  UUID NOT NULL REFERENCES operators(id),
  aircraft_id  UUID REFERENCES aircraft(id),
  origin_lat   DECIMAL(9,6) NOT NULL,
  origin_lng   DECIMAL(9,6) NOT NULL,
  dest_lat     DECIMAL(9,6) NOT NULL,
  dest_lng     DECIMAL(9,6) NOT NULL,
  cargo_type   VARCHAR(50),           -- 'medical' | 'package' | 'inspection' | 'passenger'
  priority     VARCHAR(10) DEFAULT 'normal',  -- 'urgent' | 'normal' | 'low'
  status       VARCHAR(20) DEFAULT 'queued',  -- 'queued' | 'assigned' | 'in-flight' | 'completed' | 'cancelled' | 'conflict'
  conflict_reason TEXT,
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at   TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

-- users table (auth, minimal)
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  UUID NOT NULL REFERENCES operators(id),
  email        VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role         VARCHAR(20) DEFAULT 'dispatcher',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Steps

### Step 1 — Schema + BullMQ Setup

**Context:** Two migrations (missions + users tables) + BullMQ wired to existing Redis. No logic yet — just the infrastructure that all other steps depend on.

**Tasks:**
- [ ] `backend/migrations/003_missions.js` — missions table per schema above
- [ ] `backend/migrations/004_users.js` — users table per schema above
- [ ] `npm install bullmq` in backend
- [ ] `backend/src/queues/missionQueue.js`:
  ```js
  const { Queue } = require('bullmq');
  const { REDIS_URL } = require('../config');
  // Parse redis URL for BullMQ connection config
  const missionQueue = new Queue('missions', { connection: { host, port, password } });
  module.exports = { missionQueue };
  ```
- [ ] `backend/src/workers/missionWorker.js` — Worker shell (processes jobs, logs job ID + status, no logic yet):
  ```js
  const { Worker } = require('bullmq');
  // worker.on('completed'), worker.on('failed') — log only
  ```
- [ ] Start worker in `backend/src/index.js` alongside Fleet Map Service
- [ ] Add `backend/package.json` scripts: `"worker": "node src/workers/missionWorker.js"`

**Verification:**
```bash
npm run migrate
# → 003_missions + 004_users applied

redis-cli KEYS "bull:*"
# → bull:missions:* keys exist after first job (test with manual add)

npm run dev
# → "Mission queue ready" logged on startup
```

**Exit criteria:** Migrations clean. BullMQ queue initializes without error. Worker starts and listens.

---

### Step 2 — Assignment Engine

**Context:** Given a mission (origin lat/lng), pick the best available aircraft. Criteria in priority order: (1) status === 'ready', (2) battery_pct ≥ 40, (3) shortest great-circle distance from aircraft's current position to mission origin. Returns the winning aircraft ID or null if none available.

**Tasks:**
- [ ] `backend/src/services/assignmentEngine.js`:
  ```js
  const { fleetState } = require('./fleetMap');

  function haversineKm(lat1, lng1, lat2, lng2) {
    // standard haversine — returns km
  }

  function selectAircraft(originLat, originLng) {
    const candidates = Object.values(fleetState).filter(
      (a) => a.status === 'ready' && a.battery_pct >= 40
    );
    if (!candidates.length) return null;

    return candidates.reduce((best, current) => {
      const distCurrent = haversineKm(originLat, originLng, current.lat, current.lng);
      const distBest    = haversineKm(originLat, originLng, best.lat, best.lng);
      return distCurrent < distBest ? current : best;
    });
  }

  module.exports = { selectAircraft };
  ```
- [ ] Unit test: `backend/src/services/assignmentEngine.test.js`
  - mock fleetState with 3 aircraft at different positions/batteries
  - verify nearest ready aircraft with battery ≥ 40 is selected
  - verify null returned when no candidates

**Verification:**
```bash
node --test src/services/assignmentEngine.test.js
# → all assertions pass
```

**Exit criteria:** Assignment engine selects correct aircraft from mock fleet state. Handles no-candidates case.

---

### Step 3 — Deconfliction Service

**Context:** Before confirming an assignment, check whether the proposed route conflicts with any currently active mission. Simple time-window spatial check: if two routes pass within 500m of each other during overlapping time windows (based on estimated flight time at aircraft cruise speed), flag as conflict.

**Algorithm:**
1. Sample proposed route into waypoints every 500m (linear interpolation between origin → dest)
2. For each active mission (status = 'in-flight' or 'assigned'), sample its route the same way
3. Estimate time-at-waypoint for each aircraft (distance / cruise speed)
4. If any two waypoints from different missions are within 500m AND their time windows overlap (±2 min), return `{ conflict: true, reason: "..." }`
5. Otherwise return `{ conflict: false }`

**Tasks:**
- [ ] `backend/src/services/deconfliction.js`:
  - `sampleRoute(originLat, originLng, destLat, destLng, stepKm = 0.5)` → array of `{lat, lng, estimatedMinutes}`
  - `checkConflict(proposedMission, activeMissions)` → `{ conflict: bool, reason: string | null }`
- [ ] Unit test: `backend/src/services/deconfliction.test.js`
  - test with two crossing routes — expect conflict detected
  - test with two parallel routes 2km apart — expect no conflict
  - test with sequential routes (same corridor, different time windows) — expect no conflict

**Verification:**
```bash
node --test src/services/deconfliction.test.js
# → all assertions pass
```

**Exit criteria:** Conflicts detected on crossing routes. No false positives on parallel or time-separated routes.

---

### Step 4 — Dispatch REST API

**Context:** The REST endpoints operators hit to create and manage missions. All routes are operator-scoped via `req.operatorId` (from authStub now, from real JWT in Step 5 — zero change to routes).

**Tasks:**
- [ ] `backend/src/routes/missions.js`:
  - `POST /api/missions` — validate body, run assignment engine, run deconfliction, create DB row, enqueue BullMQ job, return mission object
  - `GET /api/missions` — list all missions for operator, ordered by dispatched_at DESC
  - `GET /api/missions/:id` — single mission with aircraft details joined
  - `PATCH /api/missions/:id/cancel` — set status = 'cancelled', remove from queue if queued
- [ ] `backend/src/repositories/missionRepository.js` — DB queries (create, list, getById, cancel)
- [ ] Request validation on `POST /api/missions`:
  ```js
  // Required: origin_lat, origin_lng, dest_lat, dest_lng (all numbers, valid range)
  // Optional: cargo_type, priority
  // 400 if missing or out of range
  ```
- [ ] Response on conflict: `{ status: 409, mission: { status: 'conflict', conflict_reason: '...' } }`
- [ ] Response on no aircraft available: `{ status: 409, mission: { status: 'queued', conflict_reason: 'No aircraft available' } }`
- [ ] Wire routes in `backend/src/routes/index.js`

**Verification:**
```bash
# Create mission
curl -X POST http://localhost:3001/api/missions \
  -H 'Content-Type: application/json' \
  -d '{"origin_lat":32.7767,"origin_lng":-96.797,"dest_lat":32.8998,"dest_lng":-97.0403,"cargo_type":"medical","priority":"urgent"}'
# → { id, status: 'assigned', aircraft_id: '...', ... }

# List missions
curl http://localhost:3001/api/missions
# → array with the mission above

# Attempt conflict (run second mission on same route immediately)
# → { status: 409, ... }
```

**Exit criteria:** All four endpoints respond correctly. Conflict returns 409. Assignment populates aircraft_id.

---

### Step 5 — Auth Layer (JWT)

**Context:** Replace `authStub` with real JWT auth. Minimal scope: login endpoint returns token, middleware verifies it, no registration UI. Two hardcoded seed users for demo. All `/api/*` routes except `POST /api/auth/login` and `GET /api/health` require a valid token.

**Tasks:**
- [ ] `npm install jsonwebtoken bcryptjs` in backend
- [ ] `backend/src/middleware/auth.js` — replace stub:
  ```js
  const jwt = require('jsonwebtoken');
  function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.operatorId = payload.operatorId;
      req.userId = payload.userId;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
  module.exports = { authMiddleware };
  ```
- [ ] `backend/src/routes/auth.js` — `POST /api/auth/login`:
  - Look up user by email in DB
  - `bcryptjs.compare(password, user.password_hash)`
  - Return `{ token: jwt.sign({ operatorId, userId }, JWT_SECRET, { expiresIn: '8h' }) }`
- [ ] `backend/migrations/005_seed_users.js` — seed two demo users:
  - `dispatcher@volant.demo` / `dispatch123`
  - `admin@volant.demo` / `admin123`
  - Hash passwords with bcrypt (cost 10) — store hash in migration, NOT plaintext
- [ ] `.env.example` — add `JWT_SECRET=change_me_before_deploy`
- [ ] Update `backend/src/index.js` — swap `authStub` → `authMiddleware`, exempt `/api/auth/login` and `/health`
- [ ] Socket.io auth: pass token in socket handshake auth, verify in `socket.js` `io.use()` middleware

**Verification:**
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dispatcher@volant.demo","password":"dispatch123"}'
# → { token: "eyJ..." }

# Use token
curl http://localhost:3001/api/aircraft \
  -H 'Authorization: Bearer eyJ...'
# → aircraft array

# No token
curl http://localhost:3001/api/aircraft
# → { error: "No token" }
```

**Exit criteria:** Protected routes return 401 without token. Login returns valid JWT. Socket.io rejects unauthenticated connections.

---

### Step 6 — BullMQ Worker: Mission State Machine

**Context:** The worker processes missions through states: `queued → assigned → in-flight → completed`. Each transition updates the DB and broadcasts a Socket.io event. On assignment, the worker also overrides the simulator — sets the assigned aircraft's status to `in-flight` in `fleetState` (overriding the simulator's natural state machine temporarily).

**Tasks:**
- [ ] `backend/src/workers/missionWorker.js` — full implementation:
  ```js
  // Job data: { missionId, aircraftId, originLat, originLng, destLat, destLng }
  // States:
  //   1. 'assigned'  → update DB, broadcast mission:update via Socket.io
  //   2. 'in-flight' → set fleetState[aircraftId].status = 'in-flight' (override simulator)
  //   3. sleep until estimated flight time elapsed (haversine distance / cruise speed)
  //   4. 'completed' → restore aircraft status to 'charging', update DB, broadcast mission:update
  ```
- [ ] `backend/src/socket.js` — add `mission:update` broadcast:
  - Payload: `{ mission_id, status, aircraft_id, tail_number, ... }`
- [ ] Worker handles job failure (aircraft lost connection mid-flight) → status = 'failed', aircraft status reset
- [ ] `missionRepository.updateStatus(id, status, fields)` — update DB + timestamp fields

**Verification:**
```bash
# POST a mission → watch terminal
# → "Mission job queued: <id>"
# → "Mission assigned: <id> → N308VL"
# → "Mission in-flight: <id>"
# (after flight time) → "Mission completed: <id>"

# Watch Socket.io
node -e "const {io}=require('socket.io-client');const s=io('http://localhost:3001',{auth:{token:'eyJ...'}});s.on('mission:update',d=>console.log(d))"
# → state transitions arrive as events
```

**Exit criteria:** Full state machine runs end-to-end. Aircraft status transitions correctly. Completed mission releases aircraft back to charging.

---

### Step 7 — Dispatch UI

**Context:** Two new views: Login page (new, pre-auth), Dispatch view (new nav item replacing locked Slice 2 placeholder). Login stores JWT in localStorage and passes it to useFleetSocket. Dispatch view has: mission creation form + active/recent missions queue list.

**Activate:** `ui-ux-pro-max` + accessibility-agents (auto)

**Tasks:**
- [ ] `frontend/src/views/Login.jsx`:
  - Email + password fields, Submit button
  - POST to `/api/auth/login`, store token in localStorage
  - On success: redirect to `/`
  - Error state: "Invalid credentials" inline (no modal)
  - Accessible: label/input association, focus management on error
- [ ] `frontend/src/hooks/useAuth.js`:
  - `token`, `login(email, password)`, `logout()`
  - Reads/writes `localStorage.getItem('volant_token')`
- [ ] `frontend/src/hooks/useFleetSocket.js` — pass token in Socket.io handshake:
  ```js
  const socket = io(SOCKET_URL, {
    auth: { token: localStorage.getItem('volant_token') },
    ...
  });
  ```
- [ ] `frontend/src/views/Dispatch.jsx`:
  - Left panel: mission creation form (origin point, dest point — click on map or lat/lng inputs; cargo type dropdown; priority dropdown; Dispatch button)
  - Right panel: mission queue (active missions list, each row shows tail#, status, priority, cargo type, dispatched time)
  - Status badges use existing StatusPill pattern
  - Listens to `mission:update` Socket.io events — live row updates
- [ ] `frontend/src/App.jsx` — add `/dispatch` route, add auth guard (redirect to `/login` if no token)
- [ ] `frontend/src/components/Sidebar.jsx` — unlock Mission Dispatch nav item (was locked in Slice 1), add `/login` link in footer

**Verification:**
- Open `http://localhost:5173/login` → login form appears
- Login → redirects to Fleet Map
- Navigate to `/dispatch` → dispatch form + empty queue
- Submit mission → row appears in queue, status updates live
- Fleet Map: assigned aircraft marker changes to in-flight (green)

**Exit criteria:** Full dispatch flow works end-to-end in UI. Mission state transitions visible live without page refresh.

---

### Step 8 — Mission Map Overlay

**Context:** When a mission is active, draw its route on the Fleet Map as a dashed line from origin to destination, with a small pin at origin and destination. Color-coded by priority (urgent = red dashed, normal = accent blue dashed). Disappears when mission completes.

**Activate:** `ui-ux-pro-max`

**Tasks:**
- [ ] `frontend/src/hooks/useMissionSocket.js` — subscribes to `mission:update`, maintains `missionsState` map (mission_id → mission object)
- [ ] `frontend/src/views/FleetMap.jsx` — add GeoJSON `LineString` layer for active missions:
  - Source: `mission-routes` — FeatureCollection, one LineString per active mission
  - Layer: dashed line, color = urgent `#ef4444` / normal `#2f7ef5` / low `#6b7280`
  - On mission:update → update source data (no full re-render)
  - On mission complete → remove that feature from collection
- [ ] Origin/destination markers: small square icon (distinct from circular aircraft markers)
- [ ] Overlay badge in top-right: "Active Missions: N" alongside aircraft count

**Verification:**
- Dispatch a mission → dashed route appears on map immediately
- Assigned aircraft moves toward destination
- Mission completes → dashed route disappears

**Exit criteria:** Routes visible, correct colors, disappear on completion. No jitter from route updates.

---

### Step 9 — Demo Scenario Update

**Context:** Update `npm run demo` to include a Slice 2 sequence. The demo script should show: existing Slice 1 state (aircraft flying), then at T+30s an operator dispatches an urgent medical mission, system assigns N308VL (status: ready at DFW), deconfliction passes, route appears on map, aircraft flies to destination, mission completes at T+90s.

**Activate:** `product-lens`

**Tasks:**
- [ ] `backend/simulator/demoScenario.js` — script that fires API calls on a timer:
  ```
  T+0s   Fleet Map shows 10 aircraft in Slice 1 state
  T+30s  POST /api/missions (medical, urgent, DFW → downtown Dallas)
         → system assigns N308VL (ready, full battery)
         → route appears on map (red dashed, urgent)
  T+60s  N308VL reaches midpoint, battery at 71%
         → detail panel open on N308VL shows live battery + status
  T+90s  N308VL completes mission → status: charging
         → mission queue shows "Completed"
         → route disappears from map
  ```
- [ ] `platform/package.json` demo script — wire demoScenario alongside simulator in `npm run demo`
- [ ] Hardcode demo credentials (dispatcher@volant.demo) in demoScenario so it auto-logs in

**Verification:**
- `npm run demo` → full sequence plays without manual interaction
- All transitions happen at correct timing
- Map route appears and disappears correctly

**Exit criteria:** Any person can `npm run demo` cold and watch the full Slice 2 story in 90 seconds.

---

## Dependency Graph

```
Step 1 (schema + queue)
    ↓
Step 2 (assignment)    Step 5 (auth)
    ↓                      ↓
Step 3 (deconfliction) Step 7 (dispatch UI) ← depends on Step 5 + Step 4
    ↓
Step 4 (dispatch API)
    ↓
Step 6 (worker state machine)
    ↓
Step 8 (mission map overlay) ← depends on Step 6 + Step 7
    ↓
Step 9 (demo scenario)
```

**Parallel opportunities:**
- Steps 2 + 3 (assignment + deconfliction) are independent — build in parallel
- Step 5 (auth) is independent of Steps 2-4 — can run in parallel after Step 1

---

## Invariants

- All mission queries filter by `operator_id` — no cross-operator data leakage
- `fleetState` is the single source of truth for aircraft availability — Assignment Engine reads it, never queries DB for live state
- Mission state transitions are only made by the BullMQ worker — no direct DB writes from API routes beyond `INSERT`
- Auth middleware is the ONLY place `req.operatorId` is set — routes never read `process.env.CURRENT_OPERATOR_ID` directly (was already stub pattern from Slice 1)
- Socket.io events require auth token in handshake — unauthenticated clients get disconnected
- Deconfliction runs BEFORE assignment is confirmed — if conflict detected, job is never queued

---

## Skills Per Step

| Step | Skills |
|------|--------|
| 1 — Schema + BullMQ | `search-first` (BullMQ + Redis URL parsing patterns) |
| 2 — Assignment Engine | `search-first` (haversine formula, aircraft selection algorithms) |
| 3 — Deconfliction | `search-first` (airspace deconfliction algorithms, route sampling) |
| 4 — Dispatch API | — |
| 5 — Auth | `search-first` (JWT + bcryptjs patterns, Socket.io auth middleware) |
| 6 — Worker state machine | `search-first` (BullMQ Worker patterns, job lifecycle) |
| 7 — Dispatch UI | `ui-ux-pro-max` + accessibility-agents |
| 8 — Mission map overlay | `ui-ux-pro-max` |
| 9 — Demo scenario | `product-lens` |

---

## Architecture Alignment

Slice 2 footprint in the full platform:
- Layer 2 (Ingestion): Socket.io still direct. `mission:update` event added alongside `aircraft:update`.
- Layer 3 (Services): Dispatch Service + Deconfliction Service added. Fleet Map Service unchanged.
- Layer 3 (Queue): BullMQ on existing Redis. No Kafka until Slice 4.
- Layer 4 (Storage): `missions` + `users` tables added to PostgreSQL.
- Layer 5 (Operator): Login view + Dispatch view added. Fleet Map and Fleet Status unchanged.

## Related
[[Plans/slice-1-fleet-overview]] · [[Plans/Plans]] · [[Plans/Next Session]] · [[CURSOR_TASKS]]
