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
- [ ] Step 4 — Fleet Map Service
- [ ] Step 5 — REST API
- [ ] Step 6 — Frontend scaffold + design system
- [ ] Step 7 — Sidebar + nav shell
- [ ] Step 8 — Live Fleet Map
- [ ] Step 9 — Aircraft detail panel
- [ ] Step 10 — Fleet Status table
- [ ] Step 11 — Demo scenario
- [ ] Step 12 — README + setup

---

## COMPLETED

- [x] **Step 1** — Repo scaffold + dev env. Docker (Postgres + Redis) healthy, backend `/health` ✓, Vite :5173 ✓. _(Apr 25)_
