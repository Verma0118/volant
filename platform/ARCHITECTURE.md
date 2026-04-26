# Volant Architecture (Slice 1)

This document defines code boundaries for contributors joining after Slice 1.

## System Overview

- `frontend` renders operator UI and consumes live fleet state from Socket.io.
- `backend` serves REST endpoints and bridges Redis telemetry to Socket.io.
- `postgres` stores operator and aircraft registry metadata.
- `redis` stores live fleet hash and pub/sub telemetry stream.

## Backend Module Boundaries

`backend/src/config.js`
- Runtime configuration and defaults.
- Single place for `DATABASE_URL`, `REDIS_URL`, `PORT`, `DEMO_MODE`.

`backend/src/db.js`
- Connection bootstrap only.
- Operator resolution and readiness checks.

`backend/src/repositories/`
- Data-access layer.
- SQL query functions only; no HTTP or Socket.io concerns.

`backend/src/services/`
- Stateful integration logic.
- Redis subscribe/publish bridge and in-memory fleet state.

`backend/src/routes/`
- HTTP transport layer.
- Request validation, response shaping, repository/service orchestration.

`backend/simulator/`
- Telemetry producer process.
- Reads seed registry rows and emits periodic state updates to Redis.

## Frontend Module Boundaries

- `src/features/fleet-map/` owns map-specific view logic.
- `src/features/fleet-status/` owns status table logic.
- `src/features/realtime/` owns live socket state subscription hooks.
- `src/shared/components/` holds reusable, feature-agnostic UI atoms.
- `src/design/` remains the token source of truth.

## Rules for New Contributors

- Avoid direct cross-feature imports; import from each feature's entry point.
- Add new SQL in repositories, not route files.
- Keep `process.env` reads in `config.js` only.
- Keep status color additions in `frontend/src/design/tokens.js` only.
- Keep auth concerns in middleware (`req.operatorId`) so tenancy remains centralized.
