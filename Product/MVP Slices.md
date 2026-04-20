---
date: 2026-04-19
type: product
tags: [mvp, build, slices, roadmap]
---

# MVP Slices — Volant Build Roadmap

The full platform is 5 views backed by a 5-layer architecture. We build it in slices — each slice is independently shippable, adds operator value, and sets up the next slice. No slice is throwaway.

---

## Slice 1 — Fleet Overview (Build Now)

**The question it answers:** Where are my aircraft and what state are they in right now?

Everything else in the platform — dispatch, maintenance, compliance — depends on this being solved first. An operator cannot dispatch an aircraft they can't see. This is the foundational slice.

### What Gets Built

**View 1: Live Fleet Map**
- Mapbox map with real-time aircraft position dots
- Color coding per aircraft status: green (in-flight), amber (charging), red (grounded/fault), blue (in-mission)
- Click any aircraft dot → detail panel slides in (tail number, battery %, altitude, speed, status, last update timestamp)
- Zone status indicator (restricted airspace overlay — static for now)
- Live aircraft count in footer (blinking dot)

**View 2: Fleet Status Table**
- All aircraft in a sortable table: tail number, type (drone/eVTOL), status pill, battery %, location, last contact
- Filter by status (in-flight / charging / maintenance / grounded)
- Click row → same detail panel as map view

**Telemetry Simulation Layer**
- Simulated aircraft broadcasting position + battery data at 1 Hz (real protocol is 10 Hz — throttled for prototype)
- Each simulated aircraft follows a randomized route with realistic battery drain curve
- Switchable to real MAVLink feed when hardware is available — simulation is a drop-in replacement, not a hack

### Tech Stack (Slice 1 only — deliberately minimal)

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React + Mapbox GL JS | Matches full-stack target; Mapbox is the right call for live aviation map |
| API | Node.js + Express | Lightweight, matches full architecture |
| Live state | Redis pub/sub | Aircraft positions need push, not poll |
| WebSockets | Socket.io | Pushes position updates to frontend in real time |
| DB | PostgreSQL | Aircraft registry, status records |
| Simulation | Node.js script | Publishes fake telemetry to Redis on a loop |

**Not in Slice 1:** Kafka (added in Slice 2 when telemetry volume justifies it), TimescaleDB (added in Slice 3 for battery history), BullMQ (added in Slice 2 for dispatch queuing).

### What an Operator Can Do After Slice 1

- Open Volant and immediately know which aircraft are airborne, which are charging, which are grounded
- Click any aircraft and see its current battery level, position, and status
- Show this to a customer and have them say "yes, I need this"

### Acceptance Criteria

- [ ] Map loads with all simulated aircraft visible within 2 seconds
- [ ] Position updates push to map without page refresh
- [ ] Aircraft status changes reflect within 1 second of state change in simulation
- [ ] Detail panel shows all fields on aircraft click
- [ ] Fleet Status table matches map state at all times
- [ ] Works on desktop Chrome and Safari

---

## Slice 2 — Mission Dispatch (Next)

**The question it answers:** Which aircraft do I send, and how do I assign it?

Builds directly on Slice 1 (you need to know aircraft state before you can dispatch). Adds Mission Dispatch view: create a mission, system surfaces available aircraft (battery %, location proximity, no active hold), operator confirms, mission is queued.

Adds: BullMQ for dispatch queue, basic deconfliction check (no two aircraft assigned to same airspace corridor simultaneously).

---

## Slice 3 — Maintenance Tracker

**The question it answers:** What maintenance is due and when does this aircraft need to come down?

Adds flight-hour tracking, battery cycle count, scheduled maintenance intervals, and unscheduled incident logging. Adds TimescaleDB for battery history and degradation trending.

---

## Slice 4 — Compliance Log

**The question it answers:** Do I have the records I need if the FAA asks?

FAA Part 107/135 flight records auto-generated from dispatch data. LAANC authorization integration (FAA API → ~1.4s authorization vs 5–10 min manual). Immutable audit trail.

---

## Slice 5 — Analytics

**The question it answers:** Is my fleet profitable?

Cost per flight hour, utilization rate, downtime analysis, battery replacement forecasting. The data that tells an operator whether their operation makes economic sense.

---

## Build Order Rationale

Each slice answers a question an operator asks in the order they'd ask it on day one:
1. Where are my aircraft? (Overview)
2. How do I send one out? (Dispatch)
3. When does it need maintenance? (Maintenance)
4. Am I compliant? (Compliance)
5. Am I profitable? (Analytics)

No slice is skippable. The first operator conversation we can have is after Slice 1.

---

## Related
[[_BRIEFING]] · [[Architecture Diagram]] · [[Dashboard Mockup Notes]] · [[Tech Stack Visual]] · [[Decisions/Hackathon MVP Scope]]
