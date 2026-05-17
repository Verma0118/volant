# Volant Telemetry Ingest API

Real hardware (drones, eVTOL) sends telemetry to this endpoint instead of relying on the built-in simulator.

## Endpoint

```
POST /api/telemetry/ingest
```

## Auth

Header: `X-Volant-Api-Key: <TELEMETRY_API_KEY>`

Set `TELEMETRY_API_KEY` in `backend/.env`. Dev default: `volant_telemetry_dev_2026`.

## Request body (JSON)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `aircraft_id` | UUID string | one of `aircraft_id` or `tail_number` | DB UUID for the aircraft |
| `tail_number` | string | one of `aircraft_id` or `tail_number` | e.g. `N301VL` — resolved to aircraft_id |
| `lat` | number | yes | decimal degrees, -90 to 90 |
| `lng` | number | yes | decimal degrees, -180 to 180 |
| `altitude_ft` | number | no | feet above ground, default 0 |
| `speed_kts` | number | no | knots, default 0 |
| `heading_deg` | number | no | 0–360, default 0 |
| `battery_pct` | number | no | 0–100, default 0 |
| `status` | string | no | `in-flight` \| `charging` \| `ready` \| `maintenance` \| `grounded` |

## Example (curl)

```bash
curl -X POST http://localhost:3001/api/telemetry/ingest \
  -H "Content-Type: application/json" \
  -H "X-Volant-Api-Key: volant_telemetry_dev_2026" \
  -d '{
    "tail_number": "N301VL",
    "lat": 32.8998,
    "lng": -97.0403,
    "altitude_ft": 1200,
    "speed_kts": 110,
    "heading_deg": 180,
    "battery_pct": 74,
    "status": "in-flight"
  }'
```

## Response

```json
{ "ok": true, "aircraft_id": "<uuid>", "tail_number": "N301VL" }
```

## How it works

1. Validates payload
2. Resolves `aircraft_id` from DB (operator-scoped)
3. Publishes to Redis channel `telemetry:update` (same channel the simulator uses)
4. Fleet Map Service picks it up and broadcasts to all connected frontends via Socket.io — real-time on the map

The simulator and real hardware can run simultaneously. Real hardware payloads are tagged `"source": "hardware"` in Redis state; simulator payloads have no `source` field.

## Aircraft registration

Aircraft must exist in the DB before telemetry is accepted. Aircraft are seeded via `npm run db:init`. To add new hardware aircraft, insert a row into the `aircraft` table with the correct `operator_id`.

## Palm drone integration (future)

For the planned 5 palm-sized drones: each drone runs a firmware loop that POSTs its GPS + IMU data to this endpoint at 1–10 Hz. The `tail_number` maps to a registered aircraft row. Everything downstream (map, analytics, compliance, maintenance accrual) works unchanged.
