---
date: 2026-05-16
time: "19:56 CDT"
type: session-log
tags: [mvp-complete, telemetry, demo-polish, scrollbar-fix, shipped]
---

# Session Log — MVP Shipped

## What Was Done

### Telemetry Ingest Adapter
- `POST /api/telemetry/ingest` — hardware endpoint live
- Auth: `X-Volant-Api-Key` header, key in `TELEMETRY_API_KEY` env var (dev key in `.env`)
- Validates payload, resolves aircraft by `aircraft_id` or `tail_number`, publishes to Redis `telemetry:update` channel
- Fleet Map Service picks it up automatically — real hardware shows on map in real time
- New files: `backend/src/middleware/apiKey.js`, `backend/src/routes/telemetry.js`
- Contract doc: `platform/docs/TELEMETRY_CONTRACT.md`
- Cursor implemented 4 demo polish tasks (scenario banner, N308VL glow, Mapbox lazy-load, screen record cleanup) — pushed in `af1b7de`

### Double Scrollbar Fix
- Root cause: `body { overflow-x: hidden }` creates a BFC scroll container → implicit `overflow-y: auto` → second vertical scrollbar
- Fix: changed `html` + `body` to `overflow-x: clip` (clips without creating scroll context)
- Also removed `overflow-x: hidden` from `.fleet-map-page`, `.anly-view`, `.route-transition`, `main`, `.layout-shell`
- Removed `height: 100%` + `overflow-y: auto` from `.comp-view`
- Removed `overflow: hidden` from `.maint-view`, `overflow-y: auto` from `.maint-fleet-col` + `.maint-detail-pane`
- Fixed `topnav::after` from `width: 100vw` to `left:0; right:0` (eliminated 1rem horizontal bleed)
- Committed `84842b7`, pushed to origin/main

### Hardware Plan Saved
- 5 palm-sized drones (future) → will POST telemetry to same `/api/telemetry/ingest` endpoint
- Saved to memory

---

## MVP State — COMPLETE

| Slice | Feature | Status |
|-------|---------|--------|
| 1 | Fleet Overview (Map + Status) | ✅ |
| 2 | Mission Dispatch | ✅ |
| 3 | Maintenance Tracker | ✅ |
| 4 | Compliance Log | ✅ |
| 5 | Analytics | ✅ |
| — | Demo polish (banner, N308VL glow, Mapbox split, favicons) | ✅ |
| — | Telemetry ingest adapter | ✅ |
| — | Double scrollbar fix | ✅ |

**MVP is locally shipped on machine. No open bugs.**

---

## Next Actions (not urgent)

1. **Screen record** — full demo flow for investor deck / YC app
2. **Investor materials** — update pitch deck with live MVP screenshots
3. **Slice 3 Step 2** — flight-minute accrual (CURSOR_TASKS.md, still not started)
4. **Cost model** — cost-per-flight-hour in Analytics
5. **Palm drone hardware** — way later, telemetry adapter is already the integration point

## Run Commands (fresh stack)

```bash
cd ~/Desktop/Volant/platform && npm run stack:up && npm run db:init
npm run dev
```

Login: `dispatcher@volant.demo` / `dispatch123`
