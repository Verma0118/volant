# Volant — Autonomous Aviation Fleet Operations Platform

> "What Samsara built for trucking, we're building for autonomous aviation."

Volant is a B2B SaaS fleet operations platform for drone and eVTOL operators — real-time fleet visibility, mission dispatch, airspace compliance, and predictive maintenance in one system built specifically for aviation.

---

## The Problem

Drone and eVTOL operators have no Samsara equivalent. They're stitching together generic tools not built for airspace complexity, FAA compliance, or multi-aircraft coordination. As Archer, Joby, and others begin commercial operations in 2026, the fleet ops layer is the missing infrastructure.

## The Solution

A five-layer platform that takes aircraft telemetry and turns it into operator-ready intelligence:

```
Aircraft → Data Ingestion → Core Services → Storage → Operator Dashboard
```

### Architecture

**Layer 1 — Aircraft**
- eVTOL fleets via ADS-B + OEM APIs (GPS, battery SOC/SOH, altitude at 10 Hz)
- Drone fleets via MAVLink + Remote ID (FAA mandated)

**Layer 2 — Data Ingestion**
- Socket.io WebSockets + Apache Kafka for high-throughput streaming
- Node.js/Express API Gateway with Remote ID compliance at ingestion

**Layer 3 — Core Services**
| Service | What it does |
|---------|-------------|
| Fleet Map | Real-time position overlay (Redis + Socket.io) |
| Mission Dispatch | Aircraft assignment + operator routing (BullMQ + Redis) |
| Deconfliction Engine | 3D airspace separation, departure holds, route optimization |
| LAANC Authorization | Automated FAA airspace approval (~1.4s vs 5–10 min manual) |
| Maintenance Tracker | Battery SOH monitoring, ML anomaly detection, work orders |
| Compliance Log | FAA Part 135/107 recordkeeping, immutable audit trail |

**Layer 4 — Storage**
- Redis — live positions and real-time state (pub/sub)
- PostgreSQL — structured records: missions, users, logs
- TimescaleDB — time-series telemetry: battery cycles, trend analysis

**Layer 5 — Operator**
- Web dashboard (React + Mapbox) — live fleet map, alerts, dispatch
- Mobile app (React Native) — field operator access
- Pricing: $200–500/aircraft/month (hypothesis)

---

## Go-to-Market: Bridge Strategy

**Now — Drone fleet operators** (market exists today)
Commercial inspection, delivery, enterprise drone programs. Same platform, same software.

**Next — eVTOL operators** (Archer starts commercial ops 2026)
Air taxi networks, regional air mobility, cargo eVTOL. The platform scales up; no rebuild needed.

This bridges the timing risk: drone revenue funds the company while the eVTOL market matures.

---

## Market

- **$5.67B** — eVTOL fleet management software market by 2033, 31.2% CAGR (Market Intelo, Aug 2025)
- **$1.35B → $28.6B** — eVTOL aircraft market, 54.9% CAGR 2023–2030 (Morgan Stanley, McKinsey)
- **~$17B** — Samsara market cap Apr 2026 (the trucking comparable)

---

## Repo Contents

```
Product/          Architecture diagram, dashboard mockup, tech stack visual
Research/         Market numbers, eVTOL industry research, founder learn sheet
Graph/            Knowledge graph nodes — startup strategy, competitors, open questions
Strategy/         Positioning, brand voice
Decisions/        Settled strategic decisions and rationale
```

---

## Team

- **Aarav Verma** — Aerospace Engineering, UIUC. Product, outreach, pitch.
- **Tharun** — Materials Science, UIUC. Co-founder.

Stage: Idea/pre-seed. Actively talking to eVTOL OEMs.
