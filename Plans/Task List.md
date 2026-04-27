---
date: 2026-04-20
type: task-list
tags: [tasks, priorities, slice-1]
---

# Volant Task List

_Last updated: Apr 27, 2026 18:00 CDT_

---

## Done ✅

- [x] Volant rebrand — GitHub repo, vault, all references
- [x] Pitch deck built + validated (`Product/Archer_Deck_Content.html`)
- [x] Market numbers validated + sourced (`Research/Market Numbers.md`)
- [x] Brand voice profile built (`Strategy/Brand Voice.md`)
- [x] Contact map started (`Outreach/Contact Map.md`)
- [x] GitHub repo live: github.com/Verma0118/volant
- [x] Slice 1 blueprint built + adversarially reviewed (`Plans/slice-1-fleet-overview.md`)
- [x] Architecture + tech stack visuals updated
- [x] UI toolkit installed (magic-mcp, impeccable, accessibility-agents)
- [x] Skills index created (`Skills/Skills Index.md`)
- [x] Hackathon application submitted (pending approval)
- [x] Claude PowerPoint prompt written (9-slide deck, color scheme locked)
- [x] **Archer email sent** — Rushil's dad, concept email + deck _(assumed done Apr 20)_
- [x] **Pitch deck finalized and sent** _(assumed done Apr 20)_

---

## Now — Active Priority 🔥

- [x] **Slice 1 Step 1** — Repo scaffold + dev env ✅ _(Cursor, Apr 25)_
- [x] **Slice 1 Step 1.5** — Auth stub + tenancy schema ✅ _(Cursor, Apr 25)_
- [x] **Slice 1 Step 2** — PostgreSQL schema + 10 aircraft seeded ✅ _(Cursor, Apr 25)_
- [x] **Slice 1 Step 3** — Telemetry simulator (DFW routes, battery physics, DEMO_MODE) ✅ _(Cursor, Apr 25)_
- [x] **Slice 1 Step 4** — Fleet Map Service (Redis → Socket.io) ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 Step 5** — REST API (`GET /api/aircraft`, operator-scoped) ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 Step 6** — Frontend scaffold + design system ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 Step 7** — Sidebar + nav shell ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 Step 8** — Live Fleet Map (Mapbox GL JS) ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 Step 9** — Aircraft detail panel ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 Step 10** — Fleet Status table ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 Step 11** — Demo scenario hardening ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 Step 12** — README + setup ✅ _(Cursor, Apr 26)_
- [x] **Slice 1 stabilization + codebase hardening pass** ✅ _(Cursor, Apr 26)_
  - Backend modular boundaries (`repositories`, `routes/index`, `services/index`)
  - Frontend feature/shared entry points + import boundary lint guardrail
  - CI workflow (`.github/workflows/platform-ci.yml`)
  - Contributor docs: `ARCHITECTURE.md`, `CONTRIBUTING.md`, ADR template
- [x] **Slice 2 Step 1** — Schema (missions + users) + BullMQ queue setup ✅ _(Cursor, Apr 27)_
- [x] **Slice 2 Step 2** — Assignment Engine (haversine, best aircraft selection) ✅ _(Cursor, Apr 27)_
- [x] **Slice 2 Step 3** — Deconfliction Service (spatial/temporal conflict check) ✅ _(Cursor, Apr 27)_
- [x] **Slice 2 Step 4** — Dispatch REST API (POST/GET/PATCH /api/missions) ✅ _(Cursor, Apr 27)_
- [x] **Slice 2 Step 5** — Auth layer (JWT, login endpoint, bcrypt, Socket.io handshake) ✅ _(Cursor, Apr 27)_
- [x] **Slice 2 Step 6** — BullMQ worker + mission state machine ✅ _(Cursor, Apr 27)_
- [x] **Slice 2 Step 7** — Dispatch UI (login view + dispatch form + mission queue) ✅ _(Cursor + Claude, Apr 27)_
- [x] **Slice 2 Step 8** — Mission map overlay (selected-aircraft route focus + mission path) ✅ _(Cursor, Apr 27)_
- [x] **Slice 2 Step 9** — Demo scenario update (dispatch sequence in npm run demo) ✅ _(Cursor, Apr 27)_
- [x] **Slice 3 Step 1** — Maintenance schema (migration 006) + `maintenance_events` / `maintenance_due` ✅ _(Cursor, Apr 27)_
- [ ] **Slice 3 Step 2** — Accrue flight minutes on completed missions (idempotent) 🔥
- [ ] **Frontend bundle-size optimization (non-blocking)** — split/lazy-load heavy frontend chunks

### Claude Handoff — Finish Slice 2 Step 7 (Dispatch UI)

- [x] **Finish Step 7 in Claude Code CLI** ✅ completed Apr 27
- [x] **Already completed in codebase:**
  - `platform/backend/src/repositories/missionRepository.js` — JSDoc added above `getMissionByIdAnyOperator`
  - `platform/frontend/src/hooks/useFleetSocket.js` — now returns `socket` for shared mission subscriptions
  - `platform/frontend/src/hooks/useMissionSocket.js` — added (initial `GET /api/missions`, `mission:update` upsert, reconnect refetch, sorted `missionsList`)
- [x] **Claude should implement remaining Step 7 files:** ✅ done
  - `platform/frontend/src/features/auth/Login.jsx`
  - `platform/frontend/src/features/auth/index.js`
  - `platform/frontend/src/features/dispatch/Dispatch.jsx`
  - `platform/frontend/src/features/dispatch/index.js`
  - `platform/frontend/src/App.jsx` (auth guard + `/login` + `/dispatch` routes)
  - `platform/frontend/src/components/Sidebar.jsx` (unlock Mission Dispatch nav link)
  - `platform/frontend/src/index.css` (login + dispatch styles)
- [x] **Step 7 behavior to verify in Claude run:** ✅ verified
  - unauthenticated `/` redirects to `/login`
  - login (`dispatcher@volant.demo` / `dispatch123`) redirects to `/`
  - sidebar shows clickable `Mission Dispatch` link
  - `/dispatch` shows mission form + queue
  - quick-fill buttons populate DFW coordinates
  - submit mission shows success/error inline messages with proper live regions
  - mission queue updates live via socket `mission:update` (assigned → in-flight → completed)
  - `cd platform/frontend && npm run build` passes clean

---

## Up Next (in order)

- [ ] **Slice 3** — Maintenance Tracker (see `Plans/slice-3-maintenance-tracker.md`, `CURSOR_TASKS.md`)
- [ ] **Slice 4** — Compliance log (FAA / LAANC) — after Slice 3 core
- [ ] Frontend route-level code-splitting (`FleetMap` / `FleetStatus`) to reduce main bundle

---

## Waiting / Async

- [~] Hackathon approval — not accepted, no longer relevant
- [ ] Archer reply — email sent Apr 20, follow-up if no response in 5–7 days
- [ ] Obsidian Git plugin — manual install in Obsidian UI
- [ ] Ask Rushil's dad to forward to Director of Digital Technology Program Management

---

## Someday / Slice 4+

- [x] Slice 2 — Mission Dispatch (BullMQ, deconfliction, aircraft assignment) — **done**
- [ ] Slice 3 — Maintenance Tracker (in progress — blueprint `Plans/slice-3-maintenance-tracker.md`)
- [ ] Slice 4 — Compliance Log (FAA Part 135/107, LAANC automation)
- [ ] Slice 5 — Analytics (cost per flight hour, utilization, fleet revenue)
- [ ] Real auth layer (JWT + login UI) — Slice 2
- [ ] Investor outreach pipeline — post-prototype
- [ ] Drone operator pilot customers — post-Slice 1 demo

---

## Related
[[_BRIEFING]] · [[Plans/Next Session]] · [[Plans/slice-1-fleet-overview]] · [[Sessions/Sessions]] · [[Unfinished Tasks]]
