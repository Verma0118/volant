# Volant Platform

Fleet operations MVP: live map + fleet status (**Slice 1**) and mission dispatch (**Slice 2**).

## What Runs Where

| Process | Role | Default URL / port |
|--------|------|---------------------|
| **Docker** | PostgreSQL + Redis | `localhost:5432`, `6379` |
| **Backend** (`npm run dev`) | REST API + Socket.io | **http://127.0.0.1:3001** |
| **Simulator** (`npm run simulator`) | Publishes fake telemetry → Redis → backend | _(no HTTP)_ |
| **Frontend** (`npm run dev`) | Vite UI | **http://127.0.0.1:5173** |

From **`platform/`**, **`npm run dev`** starts **backend + simulator + frontend** together (`DEMO_MODE=false`). Or use three terminals for the same processes manually.

---

## Run everything — step by step (first time or clean machine)

Do these **in order** from the **`platform/`** directory (`cd path/to/Volant/platform`).

### 1. Prerequisites

- **Node.js** 18+ and **npm**
- **Docker Desktop** (or Docker Engine + Compose) running
- Optional: **Mapbox** account for a public token (map tiles). Without it, the Fleet Map shows a clear “token missing” state instead of crashing.

### 2. Environment file

Create **`platform/.env`** from the template (must be **`platform/.env`**, not only inside `backend/`):

```bash
cd platform
cp .env.example .env
```

Edit **`.env`** and set at least:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD` / `REDIS_PASSWORD` | Must match what `docker compose` expects (defaults in `.env.example` work together). |
| `DATABASE_URL` | Postgres URL using the **same** password as `POSTGRES_PASSWORD`. |
| `REDIS_URL` | Redis URL using the **same** password as `REDIS_PASSWORD`. |
| `JWT_SECRET` | Any non-empty secret for signing login tokens (e.g. `volant_dev_secret`). |
| `VITE_MAPBOX_TOKEN` | Your Mapbox **public** token (`pk.`…) for map tiles. |

Leave `CURRENT_OPERATOR_ID` empty; the backend resolves it after migrations.

### 3. Start databases

```bash
cd platform
docker compose up -d
```

Wait until Postgres and Redis are healthy (`docker compose ps`).

### 4. Database schema + seed aircraft (once per DB)

```bash
cd platform/backend
npm install
npm run migrate
npm run seed
```

You should see **10 aircraft** (`N301VL`–`N310VL`). If `seed` was already applied, it is safe to run again (`ON CONFLICT`).

### 5. Start the backend (terminal 1)

```bash
cd platform/backend
npm run dev
```

Wait for logs like: `PostgreSQL connected`, `Redis connected`, `Express listening on :3001`.

Sanity check: **http://127.0.0.1:3001/health** → `{"status":"ok"}`.

### 6. Start the telemetry simulator (terminal 2)

```bash
cd platform/backend
npm run simulator
```

Without this, aircraft on the map **do not move** (stale Redis snapshot only).

### 7. Start the frontend (terminal 3)

```bash
cd platform/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

### 8. Use the app

Open **http://127.0.0.1:5173**

- You are redirected to **login** if Slice 2 auth is enabled.
- Demo dispatcher: **`dispatcher@volant.demo`** / **`dispatch123`** (created by migrations / seed users — run **`npm run migrate`** if login fails).

---

## One command — full stack (from `platform/`)

After `.env` is configured, Docker is up, and migrate + seed have been run at least once:

```bash
cd platform
npm install
npm run dev
```

This runs **backend + simulator + frontend** with **`DEMO_MODE=false`** (production-like simulator and mission timing).

---

## Full reset (Docker off, wipe DB/Redis volumes, start clean)

**Stops containers and deletes Postgres + Redis data** so you get a truly empty slate. You must run **migrate + seed** again afterward.

```bash
cd platform
npm run stack:reset
npm run stack:up
# wait until healthy: docker compose ps
npm run db:init
npm run dev
```

To stop Docker **without** deleting data:

```bash
npm run stack:down
```

---

## What You Should See (manual three-terminal run)

- **10** aircraft in the registry (if you see **20**, the DB was seeded twice under different operators — still runnable, but duplicate tails).
- **Fleet Map**: moving markers when simulator + backend are both running.
- **Mission Dispatch**: dispatch when aircraft are **ready** (or **charging** with high enough SOC — see Dispatch page rules).

## Commands

From `platform/backend`:

- `npm run migrate` — apply DB migrations
- `npm run seed` — seed 10 aircraft registry rows
- `npm run dev` — backend API + Socket.io server
- `npm run simulator` — telemetry publisher only
- `npm run smoke:health` — checks backend `/health` JSON contract

From `platform/frontend`:

- `npm run dev` — frontend only
- `npm run build` — production build check
- `npm run lint` — lint check

From `platform`:

- `npm run dev` — backend + simulator + frontend (MVP stack)
- `npm run stack:up` / `stack:down` / `stack:reset` — Docker Postgres + Redis
- `npm run db:init` — migrate + seed (after reset or fresh DB)
- `npm run verify` — backend tests + frontend lint/build
- `npm run verify:full` — migrate + seed + verify

## Roadmap

Slices **1–2** ship in this repo (fleet overview + dispatch). Slice **3+** maintenance and later slices are tracked in the vault (`Plans/`). Quick health check after changes:

```bash
cd platform && npm run verify
```

## Contributor Docs

- `ARCHITECTURE.md` — module boundaries and ownership
- `CONTRIBUTING.md` — setup, checks, and first-hour onboarding path

## Codebase Modularity Rules

To keep onboarding smooth as more developers join:

- `backend/src/config.js` is the single source of runtime configuration defaults.
- `backend/src/db.js` owns database connectivity and operator resolution only.
- `backend/src/repositories/` owns SQL access for feature domains.
- `backend/src/services/` owns stateful integrations and background stream processors.
- `backend/src/routes/` only handles HTTP concerns and delegates to repositories/services.

When adding new backend features, follow this split first, then wire into routes.
