# Volant — Fleet Overview (Slice 1)

Real-time fleet operations for drone and eVTOL operators.

Slice 1 is a demo-ready prototype of Volant's operator dashboard: 10 aircraft over DFW, live telemetry via Redis + Socket.io, and synchronized map/table detail views for fast operational awareness.

This slice is built to make the core product story obvious in under 2 minutes: where aircraft are, what state they are in, and which assets are available next.

## What You Are Seeing

- 10 simulated aircraft (`N301VL` to `N310VL`) seeded in PostgreSQL
- Live telemetry stream at 1 Hz published to Redis and broadcast via Socket.io
- Fleet Map over DFW with status-coded aircraft and Class B overlay
- Fleet Status table with sorting, filters, and live battery/status updates
- Slide-in aircraft detail panel with live telemetry fields

## Quick Start (Cold Start)

```bash
cd platform
cp .env.example .env

# Required for map rendering:
# set VITE_MAPBOX_TOKEN=pk.xxxxx in platform/.env

docker compose up -d
npm run demo
```

Then open:

- Frontend: `http://127.0.0.1:5173` (or next available port)
- Backend health: `http://127.0.0.1:3001/health`

## Demo Mode Behavior

`npm run demo` starts backend + simulator + frontend together with `DEMO_MODE=true`.

Scripted highlights:

- `T+30s`: `N304VL` transitions to charging at low battery
- `T+60s`: `N308VL` reaches 81% and transitions to ready

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

- `npm run verify` — backend tests + frontend lint/build
- `npm run verify:full` — migrate + seed + verify

## Next Slice

Slice 2 adds Mission Dispatch and route assignment workflows. See vault planning docs for staged roadmap context.

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
