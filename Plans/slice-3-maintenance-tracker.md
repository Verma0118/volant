---
date: 2026-04-27
type: plan
status: active
slice: 3
tags: [build, maintenance, mvp, slice-3]
---

# Build Plan — Slice 3: Maintenance Tracker

**Objective:** Answer *what maintenance is due and when does this aircraft need to come down?* Builds on Slices 1–2: fleet visibility and mission history become inputs for **flight time**, **battery stress**, and **reminders** — with a place to log scheduled and unscheduled maintenance.

**Success bar (demo lens):** Open **Maintenance** in the sidebar, pick an aircraft, see *hours since last maintenance*, *next due* (by hours or a simple rule), and a **log of events**; completing a mission increments accrued time on that tail number.

**Carries forward from Slice 1–2**

- Multi-tenant `operator_id`, JWT auth, existing `aircraft` and `missions` tables.
- Mission worker completion events → **hook for accruing block/flight time** (Step 2).
- Simulator/telemetry can feed **battery %** for cycle heuristics later (Step 3).
- **TimescaleDB** (hypertable for battery samples) is **optional** after core PG paths work — keep Docker the same for Step 1.

---

## Architecture Added in Slice 3

```text
Mission completed (BullMQ worker)
        │
        ▼
Maintenance accrual service  ──►  aircraft.total_flight_minutes, battery heuristics
        │
        ▼
GET /api/maintenance/*     ──►  events + due items + per-aircraft summary
        │
        ▼
Socket.io (optional)       ──►  “maintenance:update” for live badges
        │
        ▼
Frontend “Maintenance” view  ──►  table + detail + “log event” form
```

---

## Steps (summary)

| Step | What |
|------|------|
| 1 | **Schema** — maintenance columns on `aircraft`, `maintenance_events`, `maintenance_due` (or equivalent) + migrations |
| 2 | **Accrual** — on `completed` mission, add estimated/actual block minutes to `aircraft.total_flight_minutes` (idempotent per mission) |
| 3 | **Battery / cycles (MVP)** — simple `battery_cycle_count` bump rules from charging telemetry thresholds (or manual adjustment API first) |
| 4 | **REST API** — `GET/POST` maintenance events, `GET` summary per aircraft, operator-scoped |
| 5 | **UI** — `/maintenance` route, unlock sidebar, list + filter + create event (matches tokens.css) |
| 6 | **(Optional)** — Timescale hypertable for time-series battery samples; retention policy |
| 7 | **Runbook** — verify accrual by running `cd platform && npm run dev`, dispatching a mission, and confirming aircraft hours changed |

Full step-1 task detail lives in `CURSOR_TASKS.md` so Cursor can execute without re-reading this file.

---

## DB Shape (target — implement across Step 1–2)

**`aircraft` additions**

- `total_flight_minutes` — numeric, default 0 (accrued from completed missions in Slice 3).
- `battery_cycle_count` — int, default 0.
- `last_maintenance_at` — `timestamptz` nullable.
- (Optional) `last_battery_replacement_at` — for Part 107-style recordkeeping later.

**`maintenance_events`**

- `id` uuid PK, `operator_id`, `aircraft_id` FK, `event_type` (`scheduled` | `unscheduled` | `inspection` | `note`), `summary`, `details`, `performed_at`, `recorded_by` (user id nullable), `created_at`.

**`maintenance_due` (simple MVP)**

- `id` uuid PK, `operator_id`, `aircraft_id`, `kind` (`hours` | `calendar` | `battery_cycles`), `due_at` or `due_after_minutes` + `label`, `created_at`.

---

## Invariants (do not break)

- All queries scoped by `operator_id` (same as aircraft/missions).
- `tokens.js` / CSS vars only for UI colors.
- No `console.log` spam — one line per service on startup where new services are added.

---

## Related

- [[Product/MVP Slices]] · [[Plans/slice-2-mission-dispatch]] · [[DECISIONS]] · [[_BRIEFING]]
