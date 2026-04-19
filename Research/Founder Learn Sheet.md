# eVTOL & Drone Fleet Management — Founder Learn Sheet

Reference material. Know this cold before any investor, operator, or industry conversation.

---

## Key Terms

| Term | What It Means & Why It Matters |
|------|-------------------------------|
| **Part 135** | FAA cert that allows commercial air carrier operations (charging passengers for flights). Joby and Archer both need this. Without it, no commercial eVTOL market. |
| **BVLOS** | Beyond Visual Line of Sight — operating beyond naked-eye range. Currently heavily restricted. Unlocking BVLOS at scale enables large drone delivery networks. |
| **Vertiport** | eVTOL takeoff/landing infrastructure — like an airport for electric air taxis. Includes charging pads, passenger areas, ground coordination. Our software integrates here. |
| **UTM (UAS Traffic Management)** | FAA's system for managing low-altitude drone/eVTOL traffic — like ATC for urban air. Any fleet management platform must interface with UTM. |
| **Type Certification** | FAA approval that an aircraft design is safe for commercial flight. Joby and Archer are mid-process. No type cert = no commercial flights = no customers yet. |
| **FAA Part 107** | Rule governing commercial drone operations today. Sets limits on altitude, speed, VLOS, zones. Our bridge market (drone operators) all operate under Part 107. |
| **ATC** | Air Traffic Control. eVTOL operators correspond with ATC near airports. Our stack must coexist with ATC systems. |
| **MRO (Maintenance, Repair & Overhaul)** | Everything related to keeping aircraft airworthy. Predictive maintenance is a core feature of our platform. |
| **Digital Twin** | Real-time virtual replica of a physical aircraft — mirrors condition, performance, health. Key technology for fleet management. |
| **UAM (Urban Air Mobility)** | Moving people/goods within cities using electric aircraft. Air taxis, drone delivery, aerial logistics. This is our market. |
| **AAM (Advanced Air Mobility)** | Broader than UAM — includes regional electric aviation. Use AAM in formal/investor contexts. |
| **LAANC** | Low Altitude Authorization and Notification Capability — FAA system for near-real-time airspace authorization. Any drone ops platform needs LAANC integration. |
| **SOC / SOH** | State of Charge (battery level) / State of Health (long-term degradation). Critical metrics for electric fleet management. |

---

## Competitive Landscape

| Company | What They Do & Weakness |
|---------|------------------------|
| **FlytBase** | Enterprise drone autonomy — routing, fleet deconfliction, BVLOS tools. Well funded. Weakness: drones only, no eVTOL/passenger layer. |
| **AlarisPro** | Compliance, maintenance, digital twins for UAS fleets. NASA SBIR funded. Weakness: defense/enterprise only, not UAM operators. |
| **Aloft (ex-Skyward)** | Airspace management and fleet coordination for commercial drone operators (absorbed Verizon Skyward). Weakness: compliance-heavy, not operationally intelligent. |
| **AirData UAV** | Drone health management — flight log analysis, maintenance scheduling. Weakness: maintenance only, not full fleet ops. |
| **DroneDeploy** | Drone data platform, 5,000+ businesses, strong on inspection/mapping. Weakness: data capture focused, not fleet orchestration. |
| **Eve Air Mobility** | Embraer spinoff building "Vector" — their own UAM traffic management software. 21 customers. Weakness: built for their aircraft only, not interoperable. |
| **Dronetag** | Real-time fleet tracking, airspace awareness, strong on Remote ID. Weakness: hardware-dependent, narrow scope. |

> **The gap:** No company has built a fleet management OS that starts with drones today and is architected to scale into eVTOL operations tomorrow.

---

## Tech Stack — What It Takes to Build This

You don't build all of this on day one. But know the full picture.

### Layer 1: Data Ingestion & Telemetry
- Real-time protocols: MAVLink (drones), ADS-B (manned aircraft), custom OEM APIs (eVTOLs)
- IoT pipelines: Apache Kafka or AWS Kinesis for high-throughput streaming
- WebSocket connections for live aircraft state
- Remote ID compliance layer (FAA mandated)

### Layer 2: Fleet Orchestration Engine
- 3D airspace route optimization (not 2D like ground vehicles)
- Deconfliction engine — multiple aircraft, same airspace
- Mission scheduling and dispatch
- Geofencing and No-Fly Zone enforcement (FAA restricted airspace data)
- LAANC integration — automated airspace authorization

### Layer 3: Predictive Maintenance & Aircraft Health
- Digital twin per aircraft
- Battery SOC/SOH tracking — cycle count, degradation curves, replacement forecasting
- ML anomaly detection — flag sensor readings deviating from baseline
- Maintenance scheduling engine — auto-generate work orders at thresholds
- Component lifecycle tracking — per-part hours, cycles, inspection records

### Layer 4: Regulatory Compliance & Documentation
- Automated FAA-compliant flight log generation
- Pilot certification tracking
- Airspace authorization management (LAANC, waivers, COA)
- Immutable audit trail
- Remote ID broadcast compliance monitoring

### Layer 5: Vertiport / Ground Operations Integration
- Landing pad scheduling and turnaround timing
- Charging queue optimization
- Ground crew coordination and task dispatch
- Passenger flow integration (longer term)

### Layer 6: Core Infrastructure
- Cloud: AWS (aviation prefers AWS GovCloud for security compliance)
- Backend: Python or Go (performance), Node.js (APIs)
- DB: PostgreSQL (structured ops data), TimescaleDB (time-series telemetry)
- Message queue: Apache Kafka
- Frontend: React + Mapbox or Cesium (3D airspace visualization)
- Mobile: React Native for field operators
- Security: SOC2, end-to-end encryption, RBAC

### MVP — Build This First
Four features. Solve these well for drone operators. Then expand.

1. **Real-time fleet map** — aircraft location, battery level, status
2. **Flight logging** — automatic FAA-compliant logs per flight
3. **Basic maintenance tracking** — per-aircraft service records, upcoming alerts
4. **LAANC integration** — one-click airspace authorization

---

## Market Size Numbers

Have these ready for any investor conversation.

| Market | Size & Growth |
|--------|--------------|
| eVTOL Aircraft Market | $1.35B (2023) → $28.6B by 2030 (54.9% CAGR) |
| eVTOL Fleet Management Software | $1.38B today → $9.45B by 2033 (34.9% CAGR) |
| Drone Fleet Management | 52 startups, 17 funded — market exists and is paying today |
| Software's share of eVTOL market | 43% of total eVTOL market in 2024 — highest growing segment |
| Fleet Management (all vehicles) | $27B (2025) → $122B by 2035 (16.9% CAGR) |

---

## Related
- [[Research/eVTOL Industry]] — deeper competitive and market research
- [[Strategy/Open Questions]] — unresolved questions this doc raises
- [[Meetings/Archer - Rushil's Dad Call]] — call notes from Archer outreach
