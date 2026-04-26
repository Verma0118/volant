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
