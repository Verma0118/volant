---
date: 2026-04-19
type: context-brief
active_blueprint: Plans/slice-1-fleet-overview.md
active_slice: 1
tags: [next-session, build, slice-1]
---

# Next Session — Context Brief

**Claude: read this file at startup, then read the active blueprint and print it. See CLAUDE.md rule 4.**

---

## First Action

Ask: "Did you send the Archer email?" — he was sending it tonight (Apr 19) to Rushil's dad at Archer Aviation. Email is at `Outreach/Emails/Archer - Rushil Dad - Concept Email.md`. Still needs `[Name]` + `[phone]` filled in. He may have already left for India — confirm status before moving on.

---

## Active Blueprint

**File:** `Plans/slice-1-fleet-overview.md`
**Print this table at startup:**

| Step | What | Skills |
|------|------|--------|
| 1 | Repo scaffold + dev env (Docker Compose, Vite + React skeleton) | `search-first` |
| 1.5 | Auth stub + tenancy schema (`operator_id`, `node-pg-migrate`) | — |
| 2 | PostgreSQL schema + aircraft registry (10 seeded aircraft, N-numbers) | `search-first` |
| 3 | Telemetry simulator (DFW routes, battery drain, `DEMO_MODE` flag) | `search-first` |
| 4 | Fleet Map Service (Redis → in-memory state → Socket.io broadcast) | `search-first` |
| 5 | REST API (`GET /api/aircraft`, operator-scoped) | — |
| 6 | Frontend scaffold + design system (tokens.js, dark aerospace, CSS vars) | `search-first` + `ui-ux-pro-max` |
| 7 | Sidebar + nav shell (5 items, Slices 2–5 locked, live count) | `ui-ux-pro-max` |
| 8 | Live Fleet Map view (Mapbox GL JS, GeoJSON layer, interpolation, FAA overlay) | `search-first` + `ui-ux-pro-max` |
| 9 | Aircraft detail panel (slide-in 320px, live battery, all fields) | `ui-ux-pro-max` |
| 10 | Fleet Status table (sortable, filterable, live row sync) | `ui-ux-pro-max` |
| 11 | Demo scenario (`npm run demo`, scripted 90s DFW story) | `product-lens` |
| 12 | README + setup (5-min cold start, screenshot) | — |

Full step details with tasks, verification commands, and exit criteria: `Plans/slice-1-fleet-overview.md`

---

## Where Aarav Wants to Take This

**Immediate:** Build Slice 1 → working Fleet Overview prototype → demo to Archer contacts + drone operators.

**Then Slice 2:** Mission Dispatch — assign aircraft, deconfliction, BullMQ queue.

**Vision:** All 5 slices = Volant v1 MVP. A complete fleet ops platform a drone operator pays $200–500/aircraft/month for today, scales to eVTOL as Archer and Joby begin commercial ops.

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
