# Cursor Task Queue — Volant

> This file is the handoff bridge between Claude Code and Cursor.
> Claude Code writes tasks here. Cursor reads and implements. Mark done with ✅ + notes.

---

## HOW TO USE

1. Open this file in Cursor when starting a coding session
2. Find the first incomplete task (no ✅)
3. Read the linked spec for full details
4. Implement, verify exit criteria in terminal
5. Add ✅ + brief completion note
6. Claude Code will update `Plans/Task List.md` next session

---

## ACTIVE TASK

### 🔥 Step 1 — Repo Scaffold + Dev Environment

**Status:** `[✅] Done`

**Full spec:** `Plans/slice-1-fleet-overview.md` → Step 1

**What to build:**

```
platform/
├── docker-compose.yml         ← Redis 7 + Postgres 15, named volumes, healthchecks
├── .env.example               ← DATABASE_URL, REDIS_URL, VITE_MAPBOX_TOKEN, PORT, DEMO_MODE=false
├── .gitignore                 ← node_modules/, .env, dist/
├── backend/
│   ├── package.json           ← express, pg, redis, socket.io, cors, dotenv
│   └── src/
│       ├── index.js           ← Express :3001, CORS, GET /health → { status: "ok" }
│       ├── db.js              ← pg Pool, connect on startup, log "PostgreSQL connected"
│       └── redis.js           ← Redis client, connect on startup, log "Redis connected"
└── frontend/
    ├── package.json           ← vite, react, react-dom, mapbox-gl, socket.io-client
    └── index.html             ← Vite entry
```

**Exit criteria — verify all before marking done:**
```bash
cd platform && docker compose up -d
# → both Redis and Postgres healthy

cd backend && npm install && npm run dev
# → "PostgreSQL connected"
# → "Redis connected"
# → Express listening on :3001

curl http://localhost:3001/health
# → { "status": "ok" }

cd ../frontend && npm install && npm run dev
# → Vite on :5173, blank React app loads in browser, no console errors
```

**When done:** Add ✅ below and paste terminal output confirming exit criteria.

**Completion:**
```
[x] docker compose up ✓
[x] PostgreSQL connected ✓
[x] Redis connected ✓
[x] GET /health → { status: "ok" } ✓
[x] Vite :5173 loads ✓
```

✅ **Notes (what’s done / what’s blocked):**
- Platform scaffold created at `platform/` (Compose + env + backend + Vite React frontend).
- Frontend verified: Vite is serving on `http://127.0.0.1:5173/`.
- Docker verified: Postgres + Redis healthy via Compose.
- Backend verified: connects to Postgres + Redis and serves `/health`.

**Terminal proof (latest):**
```bash
# docker (services healthy)
cd /Users/aarav/Desktop/Volant/platform && docker compose up -d
cd /Users/aarav/Desktop/Volant/platform && docker compose ps
# postgres: Up ... (healthy)
# redis:    Up ... (healthy)

# backend
cd /Users/aarav/Desktop/Volant/platform/backend && npm install && npm run dev
# PostgreSQL connected
# Redis connected
# Express listening on :3001

# health
curl -fsS http://localhost:3001/health
# {"status":"ok"}

# frontend
cd /Users/aarav/Desktop/Volant/platform/frontend && npm install && npm run dev -- --host 127.0.0.1 --port 5173
# ➜  Local:   http://127.0.0.1:5173/
```

---

## ACTIVE TASK

### 🔥 Step 1.5 — Auth Stub + Tenancy Schema

**Status:** `[✅] Done`

**Full spec:** `Plans/slice-1-fleet-overview.md` → Step 1.5

**Why:** B2B SaaS needs multi-tenancy from day one. Adding `operator_id` after Slice 2 = painful migration. No login UI in Slice 1 — env var stub instead, real JWT auth in Slice 2.

**Code review fixes from Step 1 (do these first, takes 5 min):**

```js
// 1. backend/src/index.js — CORS allows 127.0.0.1 too (Cursor verified on that address)
cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] })

// 2. backend/package.json — add nodemon for hot-reload in dev
// deps: add "nodemon": "^3.1.0" to devDependencies
// scripts: "dev": "nodemon src/index.js"
```

**What to build:**

1. Install `node-pg-migrate`:
   ```bash
   cd platform/backend && npm install node-pg-migrate
   ```

2. Add to `backend/package.json` scripts:
   ```json
   "migrate": "node-pg-migrate -m migrations up",
   "migrate:down": "node-pg-migrate -m migrations down"
   ```

3. Create `backend/migrations/001_operators.js`:
   ```js
   exports.up = (pgm) => {
     pgm.createTable('operators', {
       id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
       name: { type: 'varchar(100)', notNull: true },
       created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
     });
     pgm.sql(`INSERT INTO operators (name) VALUES ('Volant Demo Ops')`);
   };
   exports.down = (pgm) => { pgm.dropTable('operators'); };
   ```

4. Create `backend/migrations/002_aircraft.js`:
   ```js
   exports.up = (pgm) => {
     pgm.createTable('aircraft', {
       id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
       tail_number: { type: 'varchar(10)', notNull: true, unique: true },
       type: { type: 'varchar(20)', notNull: true },
       model: { type: 'varchar(50)' },
       operator_name: { type: 'varchar(100)' },
       operator_id: { type: 'uuid', notNull: true, references: '"operators"' },
       created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
     });
   };
   exports.down = (pgm) => { pgm.dropTable('aircraft'); };
   ```

5. Add to `backend/.env.example`:
   ```
   CURRENT_OPERATOR_ID=    # set automatically at startup from DB
   ```

6. Update `backend/src/db.js` — after `connectPostgres()`, add `resolveOperator()`:
   ```js
   async function resolveOperator() {
     const res = await pool.query(`SELECT id FROM operators WHERE name = 'Volant Demo Ops' LIMIT 1`);
     process.env.CURRENT_OPERATOR_ID = res.rows[0].id;
     console.log(`Operator: Volant Demo Ops (${res.rows[0].id})`);
   }
   module.exports = { pool, connectPostgres, resolveOperator };
   ```

7. Call `resolveOperator()` in `backend/src/index.js` after `connectPostgres()`.

**Exit criteria:**
```bash
cd platform/backend && npm run migrate
# → 001_operators and 002_aircraft applied, no errors

psql $DATABASE_URL -c "\d aircraft"
# → operator_id column: uuid, NOT NULL

psql $DATABASE_URL -c "SELECT name FROM operators;"
# → Volant Demo Ops

npm run dev
# → PostgreSQL connected
# → Operator: Volant Demo Ops (uuid-here)
# → Redis connected
# → Express listening on :3001
```

**Completion:**
```
[x] node-pg-migrate installed
[x] 001_operators migration clean
[x] 002_aircraft migration clean
[x] operator_id column present + NOT NULL
[x] CURRENT_OPERATOR_ID logs on startup
```

✅ **Terminal proof (latest):**
```bash
cd /Users/aarav/Desktop/Volant/platform/backend && export DATABASE_URL=postgres://postgres:postgres@localhost:5432/volant && npm run migrate
# Migrating files:
# - 001_operators
# - 002_aircraft
# Migrations complete!

cd /Users/aarav/Desktop/Volant/platform && docker exec volant-postgres psql -U postgres -d volant -c "\d aircraft"
# → operator_id uuid NOT NULL + FK to operators

cd /Users/aarav/Desktop/Volant/platform && docker exec volant-postgres psql -U postgres -d volant -c "SELECT name FROM operators;"
# → Volant Demo Ops

cd /Users/aarav/Desktop/Volant/platform/backend && npm run dev
# PostgreSQL connected
# Operator: Volant Demo Ops (00000000-0000-0000-0000-000000000001)
# Redis connected
# Express listening on :3001
```

---

## QUEUE (upcoming)

### Step 2 — PostgreSQL Schema + Aircraft Registry (fully briefed, start after 1.5 ✅)

**Full spec:** `Plans/slice-1-fleet-overview.md` → Step 2

**What to build:**

1. Update `backend/src/db.js` — add `initSchema()` called after `resolveOperator()` in index.js:
   - Runs `CREATE TABLE IF NOT EXISTS` for any tables not covered by migrations
   - In practice: migrations handle schema, this just verifies connectivity

2. Create `backend/src/seed.js` — standalone seed script (run once manually):
   ```js
   // Usage: node src/seed.js
   // Seeds 10 aircraft: 6 drones + 4 eVTOL, all owned by Volant Demo Ops operator
   ```

3. **Exact seed data** (use these — researched from real Archer/DFW routes):

   ```js
   // NOTE: column is `operator` (varchar 100) per actual migration — not `operator_name`
   // operator_id is always '00000000-0000-0000-0000-000000000001' (stable UUID from migration)

   // eVTOL — Archer Midnight-class, air taxi routes DFW corridor
   { tail_number: 'N301VL', type: 'evtol', model: 'Midnight', operator: 'Archer Aviation' },
   { tail_number: 'N302VL', type: 'evtol', model: 'Midnight', operator: 'Archer Aviation' },
   { tail_number: 'N303VL', type: 'evtol', model: 'Midnight', operator: 'Archer Aviation' },
   { tail_number: 'N304VL', type: 'evtol', model: 'Midnight', operator: 'Archer Aviation' },

   // Drones — DJI Matrice 300 RTK, commercial inspection
   { tail_number: 'N305VL', type: 'drone', model: 'Matrice 300 RTK', operator: 'DFW Inspection Co' },
   { tail_number: 'N306VL', type: 'drone', model: 'Matrice 300 RTK', operator: 'DFW Inspection Co' },
   { tail_number: 'N307VL', type: 'drone', model: 'Matrice 300 RTK', operator: 'DFW Inspection Co' },
   { tail_number: 'N308VL', type: 'drone', model: 'Matrice 300 RTK', operator: 'DFW Inspection Co' },
   { tail_number: 'N309VL', type: 'drone', model: 'Matrice 300 RTK', operator: 'Alliance Drone Ops' },
   { tail_number: 'N310VL', type: 'drone', model: 'Matrice 300 RTK', operator: 'Alliance Drone Ops' },
   ```

4. Seed script must:
   - Get `CURRENT_OPERATOR_ID` (call `resolveOperator()` first, or pass it in)
   - Insert all 10 aircraft with that `operator_id`
   - Use `ON CONFLICT (tail_number) DO NOTHING` so it's safe to re-run
   - Log: `Seeded 10 aircraft`

5. Add to `backend/package.json` scripts:
   ```json
   "seed": "node src/seed.js"
   ```

6. Add `getAircraft()` and `getAircraftById(id)` to `backend/src/db.js`:
   ```js
   async function getAircraft(operatorId) {
     const res = await pool.query(
       'SELECT * FROM aircraft WHERE operator_id = $1 ORDER BY tail_number',
       [operatorId]
     );
     return res.rows;
   }
   async function getAircraftById(id, operatorId) {
     const res = await pool.query(
       'SELECT * FROM aircraft WHERE id = $1 AND operator_id = $2',
       [id, operatorId]
     );
     return res.rows[0] || null;
   }
   ```

**Exit criteria:**
```bash
node src/seed.js
# → Seeded 10 aircraft

psql $DATABASE_URL -c "SELECT tail_number, type, model FROM aircraft ORDER BY tail_number;"
# → 10 rows: N301VL–N310VL

psql $DATABASE_URL -c "SELECT COUNT(*) FROM aircraft WHERE type = 'evtol';"
# → 4

psql $DATABASE_URL -c "SELECT COUNT(*) FROM aircraft WHERE type = 'drone';"
# → 6
```

**Completion:**
```
[x] seed.js implemented with exact 10-aircraft dataset and startup operator resolution
[x] getAircraft() + getAircraftById() exported from db.js
[x] safe to re-run (ON CONFLICT DO NOTHING)
```

✅ **Notes:**
- Added `backend/src/seed.js` with the exact Step 2 dataset (N301VL-N310VL), `resolveOperator()` lookup, and `ON CONFLICT (tail_number) DO NOTHING`.
- Added `seed` script to `backend/package.json`.
- Added `initSchema()`, `getAircraft()`, and `getAircraftById()` to `backend/src/db.js`; wired `initSchema()` in startup flow at `backend/src/index.js`.
- Added `backend/simulator/index.js` with 1 Hz Redis publishing to `telemetry:update`, deterministic `DEMO_MODE` status mix, route movement, battery drain/charge, and consistent telemetry payload schema.
- Added `simulator` script to `backend/package.json` (`npm run simulator`).
- Added `telemetry:watch` script (`backend/scripts/watchTelemetry.js`) for readable live telemetry debugging.
- Applied local security hardening: localhost-only DB/Redis port binds, Redis password enforcement, env-driven Postgres config, and password-based Redis URLs in `.env.example` files.
- Updated migration scripts to glob mode (`--use-glob -m "migrations/*.js"`) to remove non-timestamp migration warnings while keeping current filenames.
- Decision log added: `Decisions/2026-04-25 - Local Security Hardening for Slice 1.md`.
- [x] Step 3 — Telemetry simulator ✅ _(implemented Apr 25)_
---

### 🔥 Step 4 — Fleet Map Service (Redis → Socket.io)

**Status:** `[✅] Done`

**Full spec:** `Plans/slice-1-fleet-overview.md` → Step 4

**Context:** Simulator is running and publishing to Redis `telemetry:update` at 1 Hz. Step 4 wires the bridge: subscribe to that channel, keep in-memory state, broadcast to every connected frontend via Socket.io. Frontend gets a full snapshot on connect (no empty map), then live updates per aircraft per tick.

**What to build:**

1. `backend/src/socket.js` — attach Socket.io to Express HTTP server:
   ```js
   const { Server } = require('socket.io');

   let io;

   function initSocket(httpServer) {
     io = new Server(httpServer, {
       cors: { origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] },
     });
     return io;
   }

   function getIO() {
     if (!io) throw new Error('Socket.io not initialized');
     return io;
   }

   module.exports = { initSocket, getIO };
   ```

2. `backend/src/services/fleetMap.js`:
   ```js
   const { createClient } = require('redis');
   const { getIO } = require('../socket');
   const { REDIS_URL } = require('../config');

   const fleetState = {};  // aircraft_id → latest telemetry object

   async function hydrateFromRedis(redisClient) {
     const snapshot = await redisClient.hGetAll('fleet:state');
     for (const [id, raw] of Object.entries(snapshot)) {
       fleetState[id] = JSON.parse(raw);
     }
     console.log(`Fleet hydrated: ${Object.keys(fleetState).length} aircraft`);
   }

   async function startFleetMap() {
     // Subscriber client (dedicated — can't share with main redis client)
     const sub = createClient({ url: REDIS_URL });
     await sub.connect();

     // Writer client for HSET
     const writer = createClient({ url: REDIS_URL });
     await writer.connect();

     await hydrateFromRedis(writer);

     // Wire Socket.io connect handler
     getIO().on('connection', (socket) => {
       socket.emit('fleet:snapshot', fleetState);
     });

     // Subscribe to telemetry stream
     await sub.subscribe('telemetry:update', async (message) => {
       const payload = JSON.parse(message);
       const id = payload.aircraft_id;

       fleetState[id] = payload;
       await writer.hSet('fleet:state', id, JSON.stringify(payload));
       getIO().emit('aircraft:update', payload);
     });

     console.log('Fleet Map Service started — subscribed to telemetry:update');
   }

   module.exports = { startFleetMap, fleetState };
   ```

3. Update `backend/src/index.js` — wire socket.js + start fleet map service:
   ```js
   const http = require('http');
   const { initSocket } = require('./socket');
   const { startFleetMap } = require('./services/fleetMap');

   // After app is built, before listen:
   const server = http.createServer(app);
   initSocket(server);

   async function start() {
     await connectPostgres();
     await resolveOperator();
     await connectRedis();
     await startFleetMap();

     server.listen(PORT, () => {
       console.log(`Express listening on :${PORT}`);
     });
   }
   start().catch(err => { console.error(err); process.exit(1); });
   ```
   > **Important:** Use `http.createServer(app)` + `server.listen()` — not `app.listen()`. Socket.io must attach to the raw HTTP server, not the Express app directly.

**Exit criteria — verify all before marking done:**
```bash
# Terminal 1 — start simulator
cd platform/backend && npm run simulator

# Terminal 2 — start backend (with fleet map service wired)
cd platform/backend && npm run dev
# → "Fleet hydrated: 10 aircraft"  (or 0 if Redis was empty — fine)
# → "Fleet Map Service started — subscribed to telemetry:update"
# → "Express listening on :3001"

# Terminal 3 — test Socket.io events
node -e "
  const { io } = require('socket.io-client');
  const socket = io('http://localhost:3001');
  socket.on('fleet:snapshot', d => {
    console.log('snapshot:', Object.keys(d).length, 'aircraft');
  });
  socket.on('aircraft:update', d => {
    console.log('update:', d.tail_number, d.battery_pct + '%', d.status);
  });
"
# → snapshot: 10 aircraft
# → updates streaming at ~1/sec with tail numbers + battery %
```

**Completion checklist:**
```
[x] socket.js created — Socket.io attaches to http.createServer, not app.listen
[x] fleetMap.js created — hydrateFromRedis + subscribe + HSET mirror + emit
[x] index.js updated — server = http.createServer(app), initSocket wired, startFleetMap called
[x] snapshot: 10 aircraft on connect
[x] aircraft:update events streaming at 1 Hz
[x] service restart recovers from fleet:state hash in <1s
```

---

---

### 🛡️ Security Hardening Fixes (do after Step 4, before Step 5)

**Status:** `[✅] Done`

**Context:** Claude Code security audit flagged these. All are small, low-risk changes. None block Step 4 — do them as a single commit immediately after Step 4 passes exit criteria.

---

**Fix 1 — `.env.example`: mark credentials as change-before-deploy**

Change the credential lines so copiers know these aren't safe defaults:
```bash
# .env.example — current (bad):
POSTGRES_PASSWORD=postgres
REDIS_PASSWORD=redis
DATABASE_URL=postgres://postgres:postgres@localhost:5432/volant
REDIS_URL=redis://:redis@localhost:6379

# .env.example — correct:
POSTGRES_PASSWORD=change_me_before_deploy
REDIS_PASSWORD=change_me_before_deploy
DATABASE_URL=postgres://postgres:change_me_before_deploy@localhost:5432/volant
REDIS_URL=redis://:change_me_before_deploy@localhost:6379
```

Add a comment block at the top of `.env.example`:
```
# Copy to .env for local dev. CHANGE POSTGRES_PASSWORD and REDIS_PASSWORD before any shared deployment.
# docker-compose.yml reads these — mismatch = containers won't connect.
```

> Note: `docker-compose.yml` uses `${REDIS_PASSWORD:-redis}` fallback. After this change, users MUST copy `.env.example` → `.env` before running. Add one line to README: "Copy `.env.example` to `.env` (required — docker-compose reads it)."

---

**Fix 2 — `backend/src/middleware/auth.js`: auth stub placeholder**

Create this file (empty stub — signals to any technical reviewer where auth slots in):
```js
// TODO Slice 2: replace with JWT verification middleware
// Shape: req.operatorId is set here, all routes read it instead of process.env.CURRENT_OPERATOR_ID
function authStub(req, _res, next) {
  req.operatorId = process.env.CURRENT_OPERATOR_ID;
  next();
}

module.exports = { authStub };
```

Wire it in `backend/src/index.js`:
```js
const { authStub } = require('./middleware/auth');
app.use(authStub);  // add after CORS, before routes
```

Update all future route handlers to use `req.operatorId` instead of reading `process.env.CURRENT_OPERATOR_ID` directly — this makes the Slice 2 auth swap a one-line change in `auth.js`, not a search-and-replace across routes.

---

**Fix 3 — `backend/src/seed.js`: add count verification after seed**

After the insert loop, add:
```js
const count = await pool.query(
  'SELECT COUNT(*) FROM aircraft WHERE operator_id = $1',
  [operatorId]
);
console.log(`Seeded 10 aircraft (${count.rows[0].count} total in DB)`);
```

Replace the current `console.log('Seeded 10 aircraft')` line.

---

**Fix 4 — `backend/src/socket.js`: add connect/disconnect logging**

In `initSocket`, add event logging so restarts and client drops are visible in the terminal:
```js
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (${io.engine.clientsCount} total)`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});
```

This lives in `socket.js` not `fleetMap.js` — the fleet map service adds its own `connection` handler separately via `getIO().on('connection', ...)`.

---

**Exit criteria:**
```bash
# .env.example has placeholder passwords, not "postgres"/"redis"
grep "change_me" platform/.env.example  # → 2 lines found

# auth.js exists and is wired
grep "authStub" platform/backend/src/index.js  # → found

# seed count logs correctly
cd platform/backend && npm run seed
# → "Seeded 10 aircraft (10 total in DB)"

# socket logging visible
npm run dev
# → start simulator in another tab, open browser to :5173
# → "Socket connected: <id> (1 total)" appears in backend terminal
```

✅ **Implementation notes:**
- `platform/.env.example` updated with `change_me_before_deploy` placeholders + copy/deploy warning comments.
- Added auth handoff stub at `platform/backend/src/middleware/auth.js` and wired `app.use(authStub)` in `platform/backend/src/index.js`.
- `platform/backend/src/seed.js` now logs verified DB count after seed (`Seeded 10 aircraft (X total in DB)`).
- `platform/backend/src/socket.js` now logs socket connect/disconnect with current client count.
- Installed `socket.io-client` in backend so CLI socket validation command works from `platform/backend`.

---

### 🔥 Step 5 — REST API

**Status:** `[✅] Done`

**Implementation notes:**
- Added `platform/backend/src/routes/aircraft.js` with:
  - `GET /api/aircraft` (operator-scoped via `req.operatorId`)
  - `GET /api/aircraft/:id` (operator-scoped + 404 handling)
- Wired routes in `platform/backend/src/index.js` with `app.use('/api/aircraft', aircraftRoutes)`.
- API responses merge DB registry fields with live telemetry from `fleetState`.
- Response includes `last_update` from telemetry timestamp.
- Runtime verified with live simulator + `curl` response showing merged static + telemetry fields.

- [x] Step 5 — REST API runtime verification
- [x] Step 6 — Frontend scaffold + design system
- [x] Step 7 — Sidebar + nav shell
- [x] Step 8 — Live Fleet Map
- [x] Step 9 — Aircraft detail panel
- [x] Step 10 — Fleet Status table
- [x] Step 11 — Demo scenario
- [x] Step 12 — README + setup

✅ **Step 6 completion notes (Apr 26):**
- Replaced Vite starter UI with Step 6 scaffold: route shell (`/` and `/status`) in `platform/frontend/src/App.jsx` + router wiring in `platform/frontend/src/main.jsx`.
- Added design-system-first global styling in `platform/frontend/src/index.css` with CSS custom properties fed from `platform/frontend/src/design/tokens.js`.
- Added reusable components `platform/frontend/src/components/StatusPill.jsx` and `platform/frontend/src/components/BatteryBar.jsx`.
- Added `platform/frontend/src/hooks/useFleetSocket.js` for `fleet:snapshot` + `aircraft:update` state sync, reconnect handling, and polite live announcement messages.
- Added Step 6 placeholder views `platform/frontend/src/views/FleetMap.jsx` and `platform/frontend/src/views/FleetStatus.jsx`.
- Implemented explicit Mapbox token failure state in `FleetMap` (`Mapbox token not configured`) instead of silent crash.
- Repaired package state and installed `react-router-dom` in `platform/frontend/package.json`; removed accidental root-level npm manifests created during shell path mismatch.

✅ **Terminal proof (latest):**
```bash
cd /Users/aarav/Desktop/Volant/platform/frontend && npm install
# added 4 packages ... found 0 vulnerabilities

cd /Users/aarav/Desktop/Volant/platform/frontend && npm run build
# vite build success
# dist/index.html + dist/assets generated

cd /Users/aarav/Desktop/Volant/platform/frontend && npm run lint
# eslint . (no errors)

cd /Users/aarav/Desktop/Volant/platform/frontend && npm run dev -- --host 127.0.0.1 --port 5173
# Port 5173 in use, Vite started on:
# http://127.0.0.1:5174/
```

---

## COMPLETED

- [x] **Step 1** — Repo scaffold + dev env. Docker (Postgres + Redis) healthy, backend `/health` ✓, Vite :5173 ✓. _(Apr 25)_

## Related

- [[Unfinished Tasks]]

---

### 🔧 Slice 1 Stabilization — 3 targeted fixes

**Status:** `[✅] Done`

**Context:** Claude Code reviewed all Slice 1 source files. Build is clean, 0 vuln, no runtime crashes. Three specific bugs found — all small, surgical fixes. Do these before Slice 2.

---

**Fix 1 (CRITICAL — map jitter) — remove `map.triggerRepaint()` from RAF loop**

File: `platform/frontend/src/views/FleetMap.jsx`, line ~147

Current code in `animate()`:
```js
entry.marker.setLngLat([entry.currentLng, entry.currentLat]);
// ...
map.triggerRepaint();  // ← DELETE THIS LINE
rafRef.current = requestAnimationFrame(animate);
```

**Why:** Markers are DOM elements overlaid on the canvas — `setLngLat()` moves them via CSS transforms. `triggerRepaint()` forces the Mapbox tile compositor to re-composite at 60fps. That's the source of the visual flash/jitter. CSS transform updates don't need a canvas repaint.

After removing: the RAF loop still runs (needed for LERP interpolation), markers still glide smoothly, but the Mapbox canvas only repaints when tiles actually change (pan, zoom). Zero visual change except the jitter disappears.

---

**Fix 2 (minor) — remove orphan `fleet:snapshot:request` emit**

File: `platform/frontend/src/hooks/useFleetSocket.js`, line ~54

```js
socket.on('connect', () => {
  setConnectionState('connected');
  setAnnouncement('Live telemetry connected.');
  socket.emit('fleet:snapshot:request');  // ← DELETE THIS LINE
});
```

**Why:** Server (`fleetMap.js`) sends `fleet:snapshot` automatically on every `connection` event — the client doesn't need to request it. The server has no handler for `fleet:snapshot:request`, so this emit is silently ignored every reconnect. Removing it is cleaner and avoids confusion when reading server logs.

---

**Fix 3 (minor) — remove unused `fleetList` from hook return**

File: `platform/frontend/src/hooks/useFleetSocket.js`

`fleetList` is computed with `useMemo` and returned from the hook, but `App.jsx` doesn't destructure it. Remove from return value:

```js
// Remove fleetList from the return object:
return {
  fleetState,
  // fleetList,   ← remove
  connectionState,
  announcement,
};
```

Also remove the `fleetList` useMemo above it:
```js
// Delete these 3 lines:
const fleetList = useMemo(
  () => Object.values(fleetState).sort((a, b) => a.tail_number.localeCompare(b.tail_number)),
  [fleetState]
);
```

**Why:** Wasted sort on every `fleetState` update (1 Hz × 10 aircraft). `FleetMap.jsx` and `FleetStatus.jsx` both derive their own sorted arrays from `fleetState` directly.

---

**Exit criteria:**
```bash
# 1. Verify jitter gone — start full stack and watch map for 30s
cd platform && docker compose up -d
cd platform/backend && npm run simulator &
cd platform/backend && npm run dev &
# open http://localhost:5173 — markers should glide with zero flash

# 2. Check no console errors in browser dev tools
# → no "triggerRepaint" warnings, no unhandled socket events

# 3. Frontend build still clean
cd platform/frontend && npm run build
# → ✓ built, 0 errors

# 4. Confirm socket snapshot still works
node -e "const {io}=require('socket.io-client');const s=io('http://localhost:3001');s.on('fleet:snapshot',d=>console.log('snapshot:',Object.keys(d).length,'aircraft'))"
# → snapshot: 10 aircraft  (arrives automatically, no request needed)
```

**Completion checklist:**
```
[x] map.triggerRepaint() removed from RAF loop in FleetMap.jsx
[x] socket.emit('fleet:snapshot:request') removed from useFleetSocket.js
[x] fleetList useMemo + return entry removed from useFleetSocket.js
[x] map jitter visually gone in browser
[x] frontend build still clean
```

✅ **Implementation notes (Apr 26):**
- Removed forced canvas repaint from `platform/frontend/src/views/FleetMap.jsx` RAF loop to stop map flash/jitter while keeping marker interpolation.
- Removed orphan `socket.emit('fleet:snapshot:request')` from `platform/frontend/src/hooks/useFleetSocket.js` (server pushes snapshot on connect automatically).
- Removed unused `fleetList` memo/return from the same hook and simplified imports.
- Verified no remaining `fleet:snapshot:request` references in `platform/` source.
- Verified frontend build passes (`npm run build --prefix "/Users/aarav/Desktop/Volant/platform/frontend"`).

---

## Claude Tomorrow Task

- Slice 2 kickoff after stabilization pass complete.
- Save session only **after** Slice 2 kickoff brief is written.

---

## Handoff Update (Apr 26, 2026)

### ✅ Slice 1 stabilization + hardening delivered

Committed in four grouped commits:

- `148112e` — repo standards + verify scripts + CI workflow scaffold
- `de1b1cf` — backend modularization (`repositories`, `routes/index`, `services/index`) + tests/smoke script
- `7409835` — frontend feature entrypoints + map/socket cleanup
- `56b090d` — architecture/contributor docs + ADR template

Verification completed:

- `cd platform && npm run verify` ✅
- `cd platform && npm run verify:full` ✅
- backend tests (`node --test`) ✅
- frontend lint/build ✅

Push status:

- ❌ `git push` blocked by token permission: missing `workflow` scope for `.github/workflows/platform-ci.yml`.

---

## SLICE 2 — Mission Dispatch

**Blueprint:** `Plans/slice-2-mission-dispatch.md` — read it before starting any step.

---

### 🔥 Slice 2 Step 1 — Schema + BullMQ Setup

**Status:** `[✅] Done`

**Full spec:** `Plans/slice-2-mission-dispatch.md` → Step 1

**Context:** Two new migrations (missions + users tables) + BullMQ wired to existing Redis. This is pure infrastructure — no business logic yet. All later steps depend on this. Redis is already running; BullMQ connects to it via the same REDIS_URL.

**What to build:**

1. `backend/migrations/003_missions.js`:
   ```js
   exports.up = (pgm) => {
     pgm.createTable('missions', {
       id:              { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
       operator_id:     { type: 'uuid', notNull: true, references: '"operators"' },
       aircraft_id:     { type: 'uuid', references: '"aircraft"' },
       origin_lat:      { type: 'decimal(9,6)', notNull: true },
       origin_lng:      { type: 'decimal(9,6)', notNull: true },
       dest_lat:        { type: 'decimal(9,6)', notNull: true },
       dest_lng:        { type: 'decimal(9,6)', notNull: true },
       cargo_type:      { type: 'varchar(50)' },
       priority:        { type: 'varchar(10)', default: "'normal'" },
       status:          { type: 'varchar(20)', default: "'queued'" },
       conflict_reason: { type: 'text' },
       dispatched_at:   { type: 'timestamptz', default: pgm.func('NOW()') },
       assigned_at:     { type: 'timestamptz' },
       completed_at:    { type: 'timestamptz' },
     });
     pgm.addIndex('missions', 'operator_id');
     pgm.addIndex('missions', 'status');
   };
   exports.down = (pgm) => { pgm.dropTable('missions'); };
   ```

2. `backend/migrations/004_users.js`:
   ```js
   exports.up = (pgm) => {
     pgm.createTable('users', {
       id:            { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
       operator_id:   { type: 'uuid', notNull: true, references: '"operators"' },
       email:         { type: 'varchar(100)', notNull: true, unique: true },
       password_hash: { type: 'varchar(100)', notNull: true },
       role:          { type: 'varchar(20)', default: "'dispatcher'" },
       created_at:    { type: 'timestamptz', default: pgm.func('NOW()') },
     });
   };
   exports.down = (pgm) => { pgm.dropTable('users'); };
   ```

3. Install BullMQ:
   ```bash
   cd platform/backend && npm install bullmq
   ```

4. `backend/src/queues/missionQueue.js`:
   ```js
   const { Queue } = require('bullmq');
   const { REDIS_URL } = require('../config');

   // BullMQ needs host/port/password separately — parse from REDIS_URL
   // REDIS_URL format: redis://:password@host:port
   function parseRedisUrl(url) {
     const u = new URL(url);
     return {
       host: u.hostname,
       port: Number(u.port) || 6379,
       password: u.password || undefined,
     };
   }

   const connection = parseRedisUrl(REDIS_URL);
   const missionQueue = new Queue('missions', { connection });

   async function initMissionQueue() {
     await missionQueue.waitUntilReady();
     console.log('Mission queue ready');
   }

   module.exports = { missionQueue, initMissionQueue };
   ```

5. `backend/src/workers/missionWorker.js` (shell only — full logic in Step 6):
   ```js
   const { Worker } = require('bullmq');
   const { REDIS_URL } = require('../config');

   function parseRedisUrl(url) {
     const u = new URL(url);
     return { host: u.hostname, port: Number(u.port) || 6379, password: u.password || undefined };
   }

   const worker = new Worker('missions', async (job) => {
     console.log(`Mission job received: ${job.id}`, job.data);
     // Full state machine implemented in Step 6
   }, { connection: parseRedisUrl(REDIS_URL) });

   worker.on('completed', (job) => console.log(`Mission job completed: ${job.id}`));
   worker.on('failed', (job, err) => console.error(`Mission job failed: ${job.id}`, err.message));

   module.exports = { worker };
   ```

6. `backend/src/index.js` — call `initMissionQueue()` in startup sequence after `startFleetMap()`:
   ```js
   const { initMissionQueue } = require('./queues/missionQueue');
   const { worker } = require('./workers/missionWorker');
   // ...
   await initMissionQueue();
   // worker auto-starts on require — just log it
   console.log('Mission worker listening');
   ```

7. Add to `backend/package.json` scripts:
   ```json
   "worker": "node src/workers/missionWorker.js"
   ```

**Exit criteria:**
```bash
cd platform/backend && npm run migrate
# → 003_missions applied, no errors
# → 004_users applied, no errors

npm run dev
# → "PostgreSQL connected"
# → "Operator: Volant Demo Ops (...)"
# → "Redis connected"
# → "Fleet Map Service started"
# → "Mission queue ready"
# → "Mission worker listening"
# → "Express listening on :3001"

# Verify tables exist
docker exec volant-postgres psql -U postgres -d volant -c "\dt"
# → operators, aircraft, missions, users all listed

# Verify BullMQ keys in Redis
docker exec volant-redis redis-cli -a change_me_before_deploy KEYS "bull:*"
# → bull:missions:* keys appear (may be empty list if no jobs yet — that's fine)
```

**Completion checklist:**
```
[x] 003_missions migration clean
[x] 004_users migration clean
[x] bullmq installed (package.json updated)
[x] missionQueue.js created + parseRedisUrl helper
[x] missionWorker.js shell created
[x] initMissionQueue() called in startup — "Mission queue ready" logged
[x] worker imported in index.js — "Mission worker listening" logged
[x] all 5 logs appear on npm run dev
```

✅ **Implementation notes (Apr 27):**
- Added migrations `platform/backend/migrations/003_missions.js` and `platform/backend/migrations/004_users.js` with proper FK constraints and indexes (`missions.operator_id`, `missions.status`).
- Installed `bullmq` and added queue bootstrap in `platform/backend/src/queues/missionQueue.js` with a shared `parseRedisUrl()` helper.
- Added worker shell in `platform/backend/src/workers/missionWorker.js` with `received/completed/failed` logging hooks (state machine remains for Step 6).
- Wired mission queue startup into `platform/backend/src/index.js` after Fleet Map service startup and confirmed worker listener log.
- Added backend script `worker` in `platform/backend/package.json`.

✅ **Terminal proof (latest):**
```bash
cd /Users/aarav/Desktop/Volant/platform/backend && npm run migrate
# → 003_missions applied
# → 004_users applied

cd /Users/aarav/Desktop/Volant/platform/backend && npm run dev
# PostgreSQL connected
# Operator: Volant Demo Ops (00000000-0000-0000-0000-000000000001)
# Redis connected
# Fleet Map Service started — subscribed to telemetry:update
# Mission queue ready
# Mission worker listening
# Express listening on :3001

cd /Users/aarav/Desktop/Volant && docker exec volant-postgres psql -U postgres -d volant -c "\dt"
# → aircraft, operators, missions, users

cd /Users/aarav/Desktop/Volant && docker exec volant-redis redis-cli -a change_me_before_deploy KEYS "bull:*"
# → bull:missions:stalled-check
# → bull:missions:meta
```

---

### 🔥 Slice 2 Step 7 — Dispatch UI (Login + Dispatch View + Mission Queue)

**Status:** `[✅] Done — implemented by Claude Code (Apr 27)`

**Full spec:** `Plans/slice-2-mission-dispatch.md` → Step 7

**Context:** Backend Steps 1-6 are done. Auth hook (`useAuth.js`) already exists. This step wires the frontend: login page, auth guard, dispatch form, live mission queue. Match the existing feature module structure — `features/fleet-map`, `features/fleet-status`, `features/realtime` are the pattern to follow.

---

**Backend security fix (do this first, 2 min):**

In `backend/src/repositories/missionRepository.js`, add JSDoc above `getMissionByIdAnyOperator`:
```js
/**
 * Internal use only — worker context, no user input reaches this.
 * Routes must use getMissionById(id, operatorId) for operator-scoped access.
 */
async function getMissionByIdAnyOperator(id) {
```

---

**What to build:**

**1. `frontend/src/features/auth/` feature module**

`frontend/src/features/auth/Login.jsx`:
```jsx
// Full login page — renders outside the layout shell (no sidebar, no top-bar)
// Uses useAuth() hook from hooks/useAuth.js
// On successful login: navigate to '/'
// On failure: show inline error below the form (not a modal, not an alert)
```

Requirements:
- `<form>` with `onSubmit`, not a button click handler
- Each input has a `<label>` with `htmlFor` matching input `id` — no placeholder-only labels
- Error message has `role="alert"` so screen readers announce it without focus move
- Submit button shows "Signing in…" and is `disabled` while request is in-flight
- No redirect loop: if already `isAuthenticated`, redirect to `/` immediately (check on mount)
- Title: `document.title = 'Sign In - Volant'`

`frontend/src/features/auth/index.js` — barrel export:
```js
export { default as Login } from './Login';
```

---

**2. Auth guard in `App.jsx`**

Update `App.jsx`:
- Import `useAuth` from `hooks/useAuth`
- Pass `token` to `useFleetSocket` (it needs to send it in Socket.io handshake — see point 4 below)
- Add `/login` route outside the layout shell (no sidebar)
- Auth guard: if `!isAuthenticated` and path !== `/login`, redirect to `/login`

```jsx
// Route structure:
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/*" element={
    isAuthenticated
      ? <AuthenticatedLayout fleetState={fleetState} activeAircraftCount={activeAircraftCount} connectionState={connectionState} announcement={announcement} />
      : <Navigate to="/login" replace />
  } />
</Routes>
```

Extract `AuthenticatedLayout` as a local component in `App.jsx` (sidebar + top-bar + routes). Do not create a separate file — keep it in App.jsx.

---

**3. Socket.io token handshake**

Update `frontend/src/features/realtime/index.js` (or `hooks/useFleetSocket.js` — wherever `io()` is called):
- Pass `auth: { token }` in the socket options
- Accept `token` as a parameter: `useFleetSocket(token)`
- App.jsx passes `token` from `useAuth()`

```js
const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  auth: { token },   // ← add this
  reconnection: true,
  ...
});
```

---

**4. `frontend/src/hooks/useMissionSocket.js`**

```js
// Subscribes to 'mission:update' Socket.io events
// Returns: missionsState (object map: mission_id → mission object)
// On 'mission:update': upsert into missionsState
// On socket reconnect: re-request missions via GET /api/missions and repopulate state
// Accepts: socket instance (passed from parent, not created here — reuse existing connection)
```

Shape of each mission object in state:
```js
{
  mission_id, status, aircraft_id, tail_number,
  priority, cargo_type, conflict_reason,
  dispatched_at, assigned_at, completed_at
}
```

---

**5. `frontend/src/features/dispatch/` feature module**

`frontend/src/features/dispatch/Dispatch.jsx` — two-panel layout:

**Left panel — Mission Creation Form:**
- Heading: "New Mission" (`<h2>`)
- Fields (all `<label>` + `<input>` pairs, no placeholder-only labels):
  - Origin Lat / Origin Lng — `type="number"`, `step="0.0001"`, `min`/`max` for DFW region
  - Dest Lat / Dest Lng — same
  - Cargo Type — `<select>`: medical | package | inspection | passenger
  - Priority — `<select>`: urgent | normal | low
- "Dispatch Mission" `<button type="submit">` — disabled while submitting
- On submit: `POST /api/missions` with `Authorization: Bearer <token>` header
- Success state: green inline confirmation "Mission dispatched — N308VL assigned" (clear after 4s)
- Error state: red inline error with `role="alert"` — show conflict reason or generic error
- Quick-fill buttons for demo: "DFW → Downtown Dallas" and "Love Field → Alliance" — pre-fill lat/lng fields with real DFW coordinates

**Right panel — Mission Queue:**
- Heading: "Active Missions" (`<h2>`)
- List (`<ul>`) of mission cards, newest first
- Each card shows: tail number (JetBrains Mono), StatusPill, priority badge, cargo type, relative time ("2m ago")
- Empty state: "No active missions — dispatch one to get started"
- Live updates via `useMissionSocket` — `aria-live="polite"` on the list container so screen readers announce new missions
- On initial load: `GET /api/missions` to populate (in case page refreshed mid-session)

`frontend/src/features/dispatch/index.js`:
```js
export { default as Dispatch } from './Dispatch';
```

---

**6. Update `Sidebar.jsx` — unlock Mission Dispatch**

Change `LOCKED_ITEMS` — remove `'Mission Dispatch'` from the locked list, add it as a real `<NavLink to="/dispatch">`:
```jsx
<li>
  <NavLink to="/dispatch" className="sidebar-link">
    Mission Dispatch
  </NavLink>
</li>
```

Keep `Maintenance` and `Analytics` locked.

---

**7. Update `App.jsx` routing — add `/dispatch` and `/login`**

Inside `AuthenticatedLayout` routes:
```jsx
<Route path="/" element={<FleetMap fleetState={fleetState} />} />
<Route path="/status" element={<FleetStatus fleetState={fleetState} />} />
<Route path="/dispatch" element={<Dispatch token={token} />} />
<Route path="*" element={<Navigate to="/" replace />} />
```

Update `RouteTitle` effect to handle `/dispatch`:
```js
if (location.pathname === '/dispatch') {
  document.title = 'Mission Dispatch - Volant';
  return;
}
```

---

**Accessibility requirements (WCAG AA — mandatory):**

Login form:
- `<form>` element with descriptive `aria-labelledby` pointing to page heading
- All inputs: explicit `<label htmlFor>`, never placeholder as label substitute
- Error: `role="alert"`, rendered in DOM (not conditional unmount — use empty string), focused or announced via live region
- Submit button: `aria-busy="true"` while in-flight

Dispatch form:
- Same label/input pairing rules as login
- Success/error messages: `role="alert"` with `aria-live="assertive"` for errors, `"polite"` for success
- Quick-fill buttons: clear accessible name ("Pre-fill: DFW Airport → Downtown Dallas")
- `<fieldset>` + `<legend>` grouping for origin fields and destination fields separately

Mission queue:
- `<ul>` with `aria-label="Active missions"` and `aria-live="polite"` — new cards announced
- Each card: `<li>` with readable content order (status first, then tail number, then time)
- Relative time ("2m ago") updates: use `<time datetime="ISO-string">` element
- Empty state: not hidden with `display:none` — render with `aria-label` intact

Color contrast:
- All status colors against `#0a0e1a` background must meet 4.5:1 — verify `#22c55e` (green), `#f59e0b` (amber), `#3b82f6` (blue), `#ef4444` (red) all pass
- Priority "urgent" label: if red text used, must be 4.5:1 against panel background

---

**Exit criteria:**
```bash
# Frontend build clean
cd platform/frontend && npm run build
# → ✓ built, 0 errors, 0 warnings about missing exports

# Login flow
# 1. Open http://localhost:5173 → redirects to /login (not authenticated)
# 2. Enter dispatcher@volant.demo / dispatch123 → redirects to /
# 3. Sidebar shows "Mission Dispatch" as clickable (not locked)
# 4. Navigate to /dispatch → form + empty queue visible

# Dispatch flow
# 1. Click "DFW → Downtown Dallas" quick-fill → lat/lng fields populate
# 2. Click "Dispatch Mission" → success message appears with tail number
# 3. Mission card appears in right panel with status "assigned"
# 4. Card status updates live to "in-flight" within seconds (no refresh)
# 5. Card status updates to "completed" after flight time elapses

# Socket auth
# Open browser devtools → Network → WS → check handshake has auth token
# Backend terminal → "Socket connected: <id>" appears after login
```

**Completion checklist:**
```
[x] features/auth/Login.jsx — form with label/input pairs, role="alert" error, disabled submit
[x] features/auth/index.js — barrel export
[x] features/dispatch/Dispatch.jsx — two-panel, form + queue, useMissionSocket wired
[x] features/dispatch/index.js — barrel export
[x] hooks/useMissionSocket.js — mission:update subscription, initial GET /api/missions load (Cursor)
[x] useFleetSocket accepts token param, passes in Socket.io auth handshake (Cursor)
[x] App.jsx — /login route outside shell, auth guard, /dispatch route added
[x] Sidebar.jsx — Mission Dispatch unlocked, links to /dispatch
[x] RouteTitle handles /dispatch
[x] missionRepository.js — JSDoc comment added to getMissionByIdAnyOperator (Cursor)
[x] frontend build clean (vite build ✓, 0 errors)
[ ] full dispatch flow works end-to-end without page refresh (needs live test with backend)
```

✅ **Implementation notes (Apr 27 — Claude Code):**
- `features/auth/Login.jsx`: full-page login outside layout shell. Accessible: explicit label/input pairs, `role="alert"` error always in DOM (not unmounted), `aria-busy` on submit, redirect guard on mount.
- `features/dispatch/Dispatch.jsx`: two-panel layout. Left: form with `<fieldset>`+`<legend>` for origin/dest coordinate pairs, quick-fill buttons with full `aria-label`, assertive live region for errors, polite for success (auto-clears 4s). Right: `aria-live="polite"` mission queue `<ul>`, always in DOM, empty state as `<li>`.
- `App.jsx`: `useAuth()` → token + isAuthenticated. `useFleetSocket(token)` → socket passed to Dispatch for mission socket reuse. `/login` route outside `AuthenticatedLayout`. Auth guard redirects unauthenticated users. `RouteTitle` handles `/dispatch`.
- `Sidebar.jsx`: Mission Dispatch removed from LOCKED_ITEMS, added as `<NavLink to="/dispatch">`.
- `index.css`: added shared form primitives (`.btn-primary`, `.btn-secondary`, `.form-field`, `.field-input`, `.field-select`), login page styles, dispatch layout + panel styles, mission queue + priority badge styles.

---

## 🔥 Step 7 — End-to-End Dispatch Flow Verification

**Status:** `[ ] Not started`

**Context:** All code is shipped and committed (`5dab177`). This is a live integration test — run the full stack and walk through the dispatch flow manually. Fix any runtime bugs found.

**Start the full stack:**
```bash
cd platform && docker compose up -d
cd platform/backend && npm run simulator &
cd platform/backend && npm run dev
cd platform/frontend && npm run dev
```

**Test sequence (do in order):**

1. **Auth guard**
   - Open `http://localhost:5173` → should redirect to `/login`
   - Confirm no flash of authenticated content before redirect

2. **Login**
   - Enter `dispatcher@volant.demo` / `dispatch123` → submit
   - Should redirect to `/` (Fleet Map)
   - Backend terminal: `Socket connected: <id>` should appear
   - If login fails with 500/401: run `cd platform/backend && npm run migrate` then retry

3. **Sidebar**
   - "Mission Dispatch" link should be visible (not locked)
   - Click it → navigates to `/dispatch`
   - Page title: `Mission Dispatch - Volant`

4. **Dispatch form — quick fill**
   - Click "DFW Airport → Downtown Dallas" button
   - Origin lat/lng and dest lat/lng fields should populate

5. **Dispatch a mission**
   - Cargo: Medical, Priority: Urgent
   - Click "Dispatch Mission"
   - Expected: green success message "Mission dispatched — N3__VL assigned" (4s then clears)
   - If 409 conflict: try again, different aircraft may have been busy
   - If no aircraft available (all grounded/charging): wait for simulator to cycle, retry

6. **Mission queue live update**
   - After dispatch: mission card appears in right panel with status "assigned"
   - Status should change to "in-flight" within a few seconds (no refresh)
   - After flight time elapses: status changes to "completed"

7. **Conflict detection**
   - Dispatch two missions on the same route back-to-back immediately
   - Second should return red error with conflict reason

8. **Socket auth**
   - Browser devtools → Network → WS tab
   - Check handshake request has `auth` field with token

**Common bugs to fix if found:**

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Login 401 even with correct creds | `005_seed_users` migration not run | `npm run migrate` |
| Login 500 | `JWT_SECRET` missing from `.env` | Add `JWT_SECRET=volant_dev_secret` to `platform/backend/.env` |
| Fleet map blank after login | Socket auth rejected — token not passed | Check `useFleetSocket(token)` call in `App.jsx` |
| Mission queue never updates | `mission:update` not broadcasting | Verify `missionWorker.js` full state machine is wired (Step 6 — may still be shell) |
| Dispatch returns 404 | Missions route not registered | Check `platform/backend/src/routes/index.js` wires `/api/missions` |

**Exit criteria:**
```
[ ] /login loads without touching / first
[ ] Login with demo creds succeeds, redirects to Fleet Map
[ ] /dispatch renders form + empty queue
[ ] Quick-fill populates coord fields
[ ] Dispatch mission → success message + card in queue
[ ] Card status updates live (assigned → in-flight → completed)
[ ] Second rapid dispatch on same route → conflict error shown
[ ] npm run build still clean after any fixes
```

**When done:** Mark this block ✅, commit fixes with message `fix: dispatch e2e verification — [what you fixed]`.
