# Operator Dashboard — Product Notes

## Status
All files now in `Product/` folder inside the vault.

| File | Description |
|------|-------------|
| `mockup.html` | UI mockup — operator dashboard |
| `architecture.html` | Architecture diagram |
| `techstack-visual.html` | Tech stack visual |
| `Archer_Deck.html` | Archer pitch deck (export to PDF via Cmd+P) |

---

## Core Views (hypothesis)
1. **Fleet Overview** — all aircraft, status at a glance (in flight, charging, maintenance, grounded)
2. **Mission Dispatch** — assign aircraft to routes/missions, operator assignment
3. **Maintenance Tracker** — flight hours, battery cycles, scheduled vs. unscheduled maintenance
4. **Compliance Log** — FAA reporting, incident logs, certifications
5. **Analytics** — utilization rates, downtime, cost per flight hour

## Key Design Principles
- Built for operators, not pilots — dispatch and ops managers are the users
- Mobile-first for ground crews, desktop for operations center
- Real-time data is the core value — stale dashboards are useless in aviation

## Open Product Questions
- Do we build our own telemetry ingestion or rely on OEM APIs?
- What's the MVP — minimum features an operator would pay for on day one?
- How do we handle the hardware/API problem before OEMs open up?

---

## Related
- [[Open Questions]] — API/OEM question is the blocker
- [[eVTOL Industry]] — market context for what operators need
- [[Positioning]] — product must deliver on the positioning promise
- [[_BRIEFING]] — startup overview
