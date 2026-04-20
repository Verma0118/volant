---
date: 2026-04-20
type: task-list
tags: [tasks, priorities, slice-1]
---

# Volant Task List

_Last updated: Apr 20, 2026 11:11 CDT_

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

- [ ] **Slice 1 Step 1** — Repo scaffold + dev env
  - `platform/` directory structure
  - `docker-compose.yml` — Redis 7 + Postgres 15
  - `backend/package.json` + Express skeleton on :3001
  - `backend/src/db.js` + `redis.js` — connect on startup
  - `frontend/package.json` — Vite + React
  - `.env.example`
  - **Exit criteria:** `docker compose up -d` + both servers start clean + `GET /health` → `{ status: "ok" }`
  - **Skills:** `search-first` → `blueprint`

---

## Up Next (in order)

- [ ] Slice 1 Step 1.5 — Auth stub + tenancy schema (`operator_id`, `node-pg-migrate`)
- [ ] Slice 1 Step 2 — PostgreSQL schema + 10 seeded aircraft (N-numbers)
- [ ] Slice 1 Step 3 — Telemetry simulator (DFW routes, battery drain, `DEMO_MODE`)
- [ ] Slice 1 Step 4 — Fleet Map Service (Redis → Socket.io broadcast)
- [ ] Slice 1 Step 5 — REST API (`GET /api/aircraft`, operator-scoped)
- [ ] Slice 1 Step 6 — Frontend scaffold + design system (`tokens.js`, dark aerospace)
- [ ] Slice 1 Step 7 — Sidebar + nav shell (5 items, locked future slices)
- [ ] Slice 1 Step 8 — Live Fleet Map (Mapbox GL JS, GeoJSON, DFW airspace overlay)
- [ ] Slice 1 Step 9 — Aircraft detail panel (slide-in, live battery)
- [ ] Slice 1 Step 10 — Fleet Status table (sortable, filterable, live sync)
- [ ] Slice 1 Step 11 — Demo scenario (`npm run demo`, scripted 90s DFW story)
- [ ] Slice 1 Step 12 — README + setup (5-min cold start)

---

## Waiting / Async

- [ ] Hackathon approval — applied, pending
- [ ] Archer reply — email sent Apr 20, follow-up if no response in 5–7 days
- [ ] Obsidian Git plugin — manual install in Obsidian UI
- [ ] Ask Rushil's dad to forward to Director of Digital Technology Program Management

---

## Someday / Slice 2+

- [ ] Slice 2 — Mission Dispatch (BullMQ, deconfliction, aircraft assignment)
- [ ] Slice 3 — Maintenance Tracker (flight hours, battery cycles, work orders)
- [ ] Slice 4 — Compliance Log (FAA Part 135/107, LAANC automation)
- [ ] Slice 5 — Analytics (cost per flight hour, utilization, fleet revenue)
- [ ] Real auth layer (JWT + login UI) — Slice 2
- [ ] Investor outreach pipeline — post-prototype
- [ ] Drone operator pilot customers — post-Slice 1 demo

---

## Related
[[_BRIEFING]] · [[Plans/Next Session]] · [[Plans/slice-1-fleet-overview]] · [[Sessions/Sessions]]
