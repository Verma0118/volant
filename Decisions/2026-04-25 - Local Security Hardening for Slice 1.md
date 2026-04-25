# Decision: Local Security Hardening for Slice 1 Dev Stack

**Date:** 2026-04-25
**Made by:** Aarav + Cursor

---

## Decision
Harden local Postgres/Redis exposure and credentials now, while keeping Step 1-3 developer flow fast.

## Context
During Slice 1 backend bring-up, Postgres and Redis were bound publicly on host ports with default credentials, and telemetry validation relied on raw Redis subscribe output that was hard to inspect quickly.

## Options Considered
1. **Keep defaults and move fast** — fastest short term, but unnecessary local exposure and weak defaults.
2. **Harden now (localhost bind + Redis auth + env-driven credentials)** — small setup overhead, better baseline security and operational clarity.

## Why We Chose This
Option 2 gives meaningful risk reduction with minimal friction and does not change product architecture. It also keeps all Step 1-3 commands usable for demos.

## What We Rejected and Why
- Rejected leaving Redis and Postgres broadly exposed because it creates avoidable local-network risk.
- Rejected forcing strict migration filename ordering immediately because existing non-timestamp migration names are already in use; this is deferred to a migration naming cleanup task.

## Open Risks
- Migration filenames (`001_*`, `002_*`) still require `--check-order false` in the default migrate script.
- Credentials remain demo defaults unless `.env` is customized per machine.

## Implemented Changes
- `platform/docker-compose.yml`
  - Bound Postgres/Redis ports to `127.0.0.1` only
  - Switched Postgres envs to configurable vars (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`)
  - Added Redis password requirement (`REDIS_PASSWORD`) and updated Redis healthcheck auth
- `platform/.env.example`
  - Added `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `REDIS_PASSWORD`
  - Updated `REDIS_URL` to password-based URL
- `platform/backend/.env.example`
  - Updated `REDIS_URL` to password-based URL
- `platform/backend/src/redis.js`
  - Updated default Redis URL to `redis://:redis@localhost:6379`
- `platform/backend/scripts/watchTelemetry.js`
  - Added readable telemetry table watcher for debugging
- `platform/backend/package.json`
  - Added `telemetry:watch`
  - Added `migrate:strict` for future migration-order enforcement

---
