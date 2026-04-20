---
date: 2026-04-19
type: decision
tags: [product, mvp, hackathon]
---

# Decision: Hackathon Build = Fleet Overview (MVP Slice 1)

## What We're Building

The hackathon produces Volant's first working prototype — the **Fleet Overview**, which is the foundational layer of the full platform.

**Scope:**
- Live dashboard showing all aircraft and real-time status (in-flight, charging, maintenance hold, grounded)
- Battery state of charge per aircraft
- Live map with aircraft positions (React + Mapbox)
- Simulated telemetry standing in for real MAVLink/ADS-B data

**Stack:**
- Frontend: React + Mapbox
- API: Node.js/Express
- Live state: Redis
- Telemetry: simulated MAVLink/ADS-B

## Why This Slice

Fleet Overview is the prerequisite for everything else in the platform — dispatch, maintenance scheduling, and compliance all depend on knowing aircraft state in real time. Building this first is the right MVP order.

## Relationship to Full Product

This is Slice 1 of the full 5-view platform:
1. **Fleet Overview** ← hackathon build
2. Mission Dispatch
3. Maintenance Tracker
4. Compliance Log
5. Analytics

The hackathon output is a live demo we can put in front of drone operators and Archer contacts immediately after.

## Related
[[_BRIEFING]] · [[Dashboard Mockup]] · [[Positioning]]
