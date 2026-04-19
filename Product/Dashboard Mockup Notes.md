# Dashboard Mockup

**File:** `Product/mockup.html`
**Purpose:** Interactive UI mockup of the operator-facing web dashboard — the primary product interface operators pay for.

---

## What It Shows

A full-screen dark-mode dashboard with a 3-column layout:
1. **Sidebar** — navigation between views
2. **Live Fleet Map** — real-time aircraft positions on a grid map
3. **Right panel** — contextual detail for selected aircraft or active view

---

## Navigation Views

| View | Purpose |
|------|---------|
| **Live Map** | Real-time aircraft positions on map, zone status, LAANC auth indicator |
| **Fleet Status** | All aircraft at a glance — in-flight, charging, maintenance, grounded |
| **Mission Dispatch** | Assign aircraft to routes/missions, operator assignment, dispatch queue |
| **Compliance Log** | FAA Part 135/107 records, incident logs, LAANC authorizations, audit trail |
| **Maintenance Tracker** | Flight hours, battery cycles, upcoming maintenance, unscheduled incidents |
| **Analytics** | Utilization rates, downtime, cost per flight hour, fleet performance trends |

---

## Design Principles (from [[Product/Dashboard Mockup]])
- **Built for operators, not pilots** — dispatch managers and operations center staff are the primary users, not the people flying the aircraft
- **Mobile-first for field, desktop for ops center** — ground crews use mobile, operations managers use the desktop dashboard
- **Real-time data is the core value** — stale dashboards are useless in aviation. Every view should reflect current aircraft state.

---

## Key UI Details
- Dark aerospace aesthetic — JetBrains Mono font, dark navy background
- Color coding: green = active/healthy, amber = warning/charging, red = grounded/fault, blue = in-mission
- Status pills in top bar show Zone status and LAANC authorization state at a glance
- Aircraft dots on map are interactive — hover/click for detail panel
- Blinking status dot in sidebar footer shows live aircraft count

---

## Open Questions
- What does the MVP look like for the first drone operator paying customer? (see [[Strategy/Open Questions]])
- How do we handle the hardware/API problem before OEMs open up their telemetry APIs?

---

## Related
- [[Product/Architecture Diagram]] — backend that powers this UI
- [[Product/Tech Stack Visual]] — interactive walkthrough of specific user flows
- [[Research/Founder Learn Sheet]] — MVPstack: fleet map, flight logging, maintenance tracking, LAANC
