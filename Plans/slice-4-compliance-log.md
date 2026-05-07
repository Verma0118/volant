---
date: 2026-05-07
type: plan
status: active
slice: 4
tags: [build, compliance, mvp, slice-4]
---

# Build Plan — Slice 4: Compliance Log

**Question answered:** Do I have the records I need if the FAA asks?

**Success bar:** Open `/compliance`, see an immutable flight log auto-generated from every completed mission — tail number, route, duration, cargo type, regulation (Part 107 / Part 135), LAANC authorization status. Export to CSV.

---

## Steps

| Step | What |
|------|------|
| 1 | Schema — `compliance_records` append-only table (migration 009) |
| 2 | Accrual — auto-create record on mission `completed` (idempotent, wired into worker) |
| 3 | LAANC simulation — coordinate-based check, mock auth code for Class B ops |
| 4 | REST API — list, detail, CSV export; operator-scoped |
| 5 | UI — `/compliance` route, flight log table, filter, export button |

---

## Schema

**`compliance_records`**

- `id` uuid PK
- `operator_id` uuid NOT NULL (no FK cascade — record must outlive operator edits)
- `mission_id` uuid NOT NULL (reference but no cascade delete)
- `aircraft_id` uuid NOT NULL
- `tail_number` varchar(20) NOT NULL (denormalized — survives aircraft edits)
- `record_type` varchar(20) NOT NULL default `'flight'`
- `origin_lat`, `origin_lng`, `dest_lat`, `dest_lng` numeric
- `departed_at` timestamptz (mission assigned_at)
- `completed_at` timestamptz
- `flight_duration_minutes` numeric(10,2)
- `cargo_type` varchar(50)
- `priority` varchar(20)
- `regulation` varchar(20) — `'part_107'` | `'part_135'`
- `laanc_status` varchar(20) — `'authorized'` | `'not_required'` | `'pending'`
- `laanc_auth_code` varchar(50) nullable
- `created_at` timestamptz default now()

No UPDATE or DELETE routes — append-only.

---

## LAANC Logic (MVP simulation)

- DFW Class B center: `32.8998, -97.0403`
- If origin OR destination within 30nm of any major DFW-area airport → `authorized`, generate mock code `LAANC-DFW-{missionId[:8].toUpperCase()}`
- Otherwise → `not_required`
- Regulation: `evtol` type → `part_135`, `drone` → `part_107`

---

## Invariants

- No DELETE or UPDATE endpoints on compliance_records
- All queries scoped by `operator_id`
- `tail_number` denormalized at record creation time
- CSV export streams rows directly — no in-memory array for large fleets
