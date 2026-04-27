---
date: 2026-04-26
type: reference
tags: [run-commands, dev, ops]
---

# Important Run Commands

All commands run from `platform/` unless noted otherwise.

---

## Stop Everything

```bash
# Stop demo / dev servers
Ctrl+C  # in the terminal running npm run demo or any npm run dev

# Stop Docker containers (keeps data)
cd /Users/aarav/Desktop/Volant/platform
docker compose down

# Stop Docker + wipe all data (full reset)
docker compose down -v
```

---

## Prerequisites (run once per machine restart)

```bash
cd /Users/aarav/Desktop/Volant/platform
docker compose up -d
# → starts Postgres 15 + Redis 7, both healthy
```

Check containers are healthy:
```bash
docker compose ps
# postgres: Up (healthy) | redis: Up (healthy)
```

---

## Slice 1 — Fleet Overview Demo

```bash
cd /Users/aarav/Desktop/Volant/platform
npm run demo
```
Opens: `http://localhost:5173`
Runs: backend (DEMO_MODE=true) + simulator + frontend all together via concurrently.

---

## Slice 1 — Dev Mode (live reload, no DEMO_MODE)

Terminal 1 — backend:
```bash
cd /Users/aarav/Desktop/Volant/platform/backend
npm run dev
```

Terminal 2 — simulator:
```bash
cd /Users/aarav/Desktop/Volant/platform/backend
npm run simulator
```

Terminal 3 — frontend:
```bash
cd /Users/aarav/Desktop/Volant/platform/frontend
npm run dev
```

---

## Database

```bash
# Run all pending migrations
cd /Users/aarav/Desktop/Volant/platform
npm run backend:migrate

# Seed 10 aircraft
npm run backend:seed

# Migrate + seed + verify (full cold start)
npm run verify:full

# Connect to Postgres directly
docker exec -it volant-postgres psql -U postgres -d volant
```

---

## Verification / CI

```bash
cd /Users/aarav/Desktop/Volant/platform

# Fast check: tests + lint + build
npm run verify

# Full check: migrate + seed + tests + lint + build
npm run verify:full

# Backend tests only
npm run backend:test

# Frontend lint only
npm run frontend:lint

# Frontend production build
npm run frontend:build
```

---

## Debugging

```bash
# Watch live telemetry in terminal (Redis pub/sub)
cd /Users/aarav/Desktop/Volant/platform/backend
npm run telemetry:watch

# Backend health smoke check
npm run smoke:health
# → hits GET /health, logs status

# Redis CLI (check keys, pub/sub)
docker exec -it volant-redis redis-cli -a change_me_before_deploy

# Watch fleet:state hash (live aircraft positions in Redis)
docker exec -it volant-redis redis-cli -a change_me_before_deploy HGETALL fleet:state
```

---

## Git / GitHub

```bash
cd /Users/aarav/Desktop/Volant
git status
git add -A
git commit -m "message"
git push

# Note: pushing .github/workflows/* requires 'workflow' scope on GitHub token
```

---

## Slice 2 (once built)

```bash
# Will be added here after Slice 2 Steps 1-9 complete
# Expected: npm run demo (same command, Slice 2 features auto-included)
```

---

## Related
[[Plans/slice-1-fleet-overview]] · [[Plans/slice-2-mission-dispatch]] · [[CURSOR_TASKS]]
