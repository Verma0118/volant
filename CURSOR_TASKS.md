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

**Status:** `[ ] Not started`

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
[ ] docker compose up ✓
[ ] PostgreSQL connected ✓
[ ] Redis connected ✓
[ ] GET /health → { status: "ok" } ✓
[ ] Vite :5173 loads ✓
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
