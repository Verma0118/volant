---
date: 2026-05-07
type: runbook
slice: 3
tags: [runbook, maintenance, validation, slice-3]
---

# Runbook — Slice 3: Maintenance Tracker

**Validated:** 2026-05-07. All steps pass on fresh stack.

---

## Prerequisites

- Docker running
- `cd platform/`

---

## Stack Setup (fresh)

```bash
npm run stack:reset        # wipes volumes
npm run stack:up           # starts timescale/timescaledb:latest-pg15 + redis:7
npm run db:init            # runs all 8 migrations + seeds 10 aircraft
```

**After reset only** — wait ~5s for Postgres to be healthy before `db:init`.

---

## Run Full Stack

```bash
npm run dev
# Starts: backend :3001, telemetry simulator, frontend :5173
```

Login: `dispatcher@volant.demo` / `dispatch123`

---

## Validate Flight-Minute Accrual

### Pre-mission baseline

```bash
curl -s -b cookies.txt http://localhost:3001/api/maintenance | jq '[.[] | {tail: .tail_number, mins: .total_flight_minutes, cycles: .battery_cycle_count}]'
# All aircraft: total_flight_minutes=0.00, battery_cycle_count=0
```

### Dispatch a mission

Via UI: `/missions` → set origin/dest → dispatch. Or via API:

```bash
# Get CSRF token from login response, then:
curl -s -b cookies.txt -X POST http://localhost:3001/api/missions \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"origin_lat":32.7767,"origin_lng":-96.797,"dest_lat":32.8998,"dest_lng":-97.0403,"priority":"urgent"}'
```

### Verify accrual after completion

```bash
curl -s -b cookies.txt http://localhost:3001/api/maintenance | jq '[.[] | select(.total_flight_minutes > 0)]'
# → assigned aircraft shows total_flight_minutes > 0, battery_cycle_count = 1
# → maintenance_minutes_applied = true on the mission (idempotency guard)
```

### Idempotency check

If worker retries the same job (simulate by calling `accrueFlightMinutes` twice with the same mission ID), `total_flight_minutes` increments only once. The `SELECT FOR UPDATE` transaction skips if `maintenance_minutes_applied = true`.

---

## Validate Battery History (Timescale)

After running the stack for ~30 seconds:

```bash
# Replace AIRCRAFT_ID with an actual ID from GET /api/aircraft
curl -s -b cookies.txt \
  "http://localhost:3001/api/maintenance/aircraft/$AIRCRAFT_ID/battery-history?hours=1" | jq length
# → N buckets (5-min time_bucket aggregates)
```

Samples write every 10 seconds per aircraft (`SAMPLE_INTERVAL_MS = 10_000` in `batteryHistoryService.js`). After 30s, expect 2–3 rows per aircraft in the `battery_samples` hypertable.

---

## Validate Maintenance UI

1. Navigate to `/maintenance`
2. Fleet table shows all 10 aircraft with `0.00` flight hours initially
3. After a completed mission, the dispatched aircraft shows accrued hours + 1 cycle
4. Click any aircraft row → detail pane opens
5. Click "Log Event" → fill form → save → event appears in the log

---

## REST API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/maintenance` | Fleet overview (all aircraft + due_count) |
| GET | `/api/maintenance/aircraft/:id` | Summary + events + due items |
| GET | `/api/maintenance/aircraft/:id/events` | Event list (limit 50, `?limit=N`) |
| POST | `/api/maintenance/aircraft/:id/events` | Log event (CSRF required) |
| GET | `/api/maintenance/aircraft/:id/due` | Due items list |
| POST | `/api/maintenance/aircraft/:id/due` | Create due item (CSRF required) |
| GET | `/api/maintenance/aircraft/:id/battery-history` | Timescale 5-min buckets (`?hours=24`, max 168) |

---

## Schema Added in Slice 3

| Migration | What |
|-----------|------|
| 006 | `aircraft` columns: `total_flight_minutes`, `battery_cycle_count`, `last_maintenance_at` |
| 006 | Tables: `maintenance_events`, `maintenance_due` |
| 007 | `missions.maintenance_minutes_applied boolean` (idempotency flag) |
| 008 | `battery_samples` Timescale hypertable (30-day retention, 1-day chunks) |

---

## Troubleshooting

**`battery_samples` insert errors on startup**: Timescale extension not installed. Run `npm run stack:reset && npm run stack:up && npm run db:init`. Requires `timescale/timescaledb:latest-pg15` image.

**`total_flight_minutes` not incrementing**: Check `missions.maintenance_minutes_applied`. If `true` already (e.g. from prior run), accrual will not double-count — expected behavior.

**Login fails after `stack:reset`**: Run `npm run db:init` to re-apply migration 005 (user seed).
