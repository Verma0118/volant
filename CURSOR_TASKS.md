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

**Status:** `[~] Scaffolded (verification blocked — Docker unavailable on this machine)`

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
[ ] docker compose up ✓ (BLOCKED — `docker` not found)
[ ] PostgreSQL connected ✓ (blocked by above)
[ ] Redis connected ✓ (blocked by above)
[ ] GET /health → { status: "ok" } ✓ (blocked by above)
[x] Vite :5173 loads ✓
```

✅ **Notes (what’s done / what’s blocked):**
- Platform scaffold created at `platform/` (Compose + env + backend + Vite React frontend).
- Frontend verified: `npm install` succeeded and Vite is serving on `http://127.0.0.1:5173/`.
- Backend runs, but cannot verify DB/Redis connectivity because Docker is not available on this machine (`docker`, `docker-compose` not found). When Postgres/Redis are running, backend should log the expected connect messages and serve `/health`.

**Terminal proof (latest):**
```bash
# docker check (host)
which docker
# docker not found

# frontend
cd /Users/aarav/Desktop/Volant/platform/frontend && npm run dev -- --host 127.0.0.1 --port 5173
# VITE v8.0.10  ready in 331 ms
# ➜  Local:   http://127.0.0.1:5173/

# backend (expected failure until Postgres is running)
cd /Users/aarav/Desktop/Volant/platform/backend && npm run dev
# Fatal startup error ... ECONNREFUSED ... 127.0.0.1:5432
```

---

## QUEUE (upcoming — wait for Claude Code to brief each one)

- [ ] Step 1.5 — Auth stub + tenancy schema
- [ ] Step 2 — PostgreSQL schema + aircraft registry
- [ ] Step 3 — Telemetry simulator
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

_(nothing yet)_
