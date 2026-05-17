# Unfinished Tasks

Carry-forward items that are known issues but not blockers for current build momentum.

## Open

- [ ] Frontend route-level code-splitting (non-blocking)
  - Context: Mapbox GL lazy-loaded May 16 — main JS ~351 kB; mapbox in separate chunk (`af1b7de`). Mapbox chunk may still warn >500 kB when loaded.
  - Remaining:
    - optional `React.lazy` for `FleetMap` / `FleetStatus` route views
    - re-run `npm run build` and compare chunk/gzip output

- [ ] Slice 3 Step 2 — flight-minute accrual on mission completed (idempotent)
  - See `CURSOR_TASKS.md` → Slice 3 Step 2

## Related

- [[CURSOR_TASKS]]
- [[Plans/Task List]]
