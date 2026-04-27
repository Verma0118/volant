---
date: 2026-04-27
type: context-brief
active_blueprint: Plans/slice-3-maintenance-tracker.md
active_slice: 3
tags: [next-session, build, slice-3]
---

# Next Session — Context Brief

**Claude: read this file at startup, then read the active blueprint and print it. See CLAUDE.md rule 4.**

---

## First Action

Slice 2 (Mission Dispatch) is complete. **Slice 3** blueprint: `Plans/slice-3-maintenance-tracker.md`. Cursor work is briefed in `CURSOR_TASKS.md` under **Slice 3 — Maintenance Tracker**.

1. Open `CURSOR_TASKS.md` — **Slice 3 Step 1** (migration `006`) is done; start **Step 2** (flight-minute accrual on mission `completed`, idempotent per mission id).
2. Use `missionWorker` + `missionRepository` + new `aircraft` columns; avoid double-counting if worker retries a job.
3. Do not block on Timescale — Step 1 is plain PostgreSQL only.

**Non-blocking:** frontend bundle size warning on `npm run build` — lazy-load Mapbox route after Slice 3 foundation is in.

**Recent hardening commits (for Claude context):**
- `148112e` — repo standards + verify workflow + CI scaffold
- `de1b1cf` — backend modular boundaries + transform tests + health smoke
- `7409835` — frontend feature entrypoints + realtime dead-work cleanup
- `56b090d` — architecture/contributor docs + ADR template

**Push note:** resolved. Commits pushed after auth scope fix. Also removed tokenized remote usage by switching to clean HTTPS remote URL.

**Non-blocking follow-up:** frontend bundle-size warning still appears on `npm run build` (large main chunk). Plan a targeted code-splitting pass after Slice 2 kickoff brief.

---

## Active Blueprint

**File:** `Plans/slice-3-maintenance-tracker.md`  
**Print this table at startup:**

| Step | What |
|------|------|
| 1 | Schema — `aircraft` maintenance columns, `maintenance_events`, `maintenance_due` (migration `006`) |
| 2 | Accrual — completed missions add flight minutes to `aircraft` (idempotent) |
| 3 | Battery / cycles (MVP) — cycle count rules or manual API |
| 4 | REST — maintenance events + summaries, operator-scoped |
| 5 | UI — `/maintenance` + sidebar unlock |
| 6 | (Optional) Timescale battery history |
| 7 | Demo — show hours/events in `npm run demo` story |

Full narrative + invariants: `Plans/slice-3-maintenance-tracker.md`

---

## Where Aarav Wants to Take This

**Done:** Slices 1–2 (Fleet Overview + Mission Dispatch) ship in `platform/`.

**Immediate (Slice 3):** Maintenance Tracker — hours, events, due items.

**Then:** Slice 4 Compliance, Slice 5 Analytics (see `Product/MVP Slices.md`).

**Vision:** All 5 slices = Volant v1 MVP — full fleet ops for drone operators now, eVTOL later.

**Hackathon:** Claude Opus 4.7 hackathon application submitted — pending approval. If approved, Slice 1 IS the hackathon submission. Claude Code builds the full stack, Aarav is the aviation domain expert.

---

## How to Update This File

When a slice is complete:
1. Change `active_blueprint` frontmatter to the next slice plan file
2. Change `active_slice` to the next number
3. Update the step table above
4. Update "First Action" to whatever the next priority is

This file is the persistent "where we left off" — update it at every session save.

## Related
[[_BRIEFING]] · [[Plans/Plans]] · [[Plans/slice-1-fleet-overview]] · [[Sessions/Sessions]]
