# Unfinished Tasks

Carry-forward items that are known issues but not blockers for current build momentum.

## Open

- [ ] Fleet Map visual flashing/jitter during live telemetry updates
  - Status: partially mitigated (map instance stability + marker interpolation + socket batching)
  - Remaining issue: user still reports visible flashing in runtime recording
  - Decision: continue Slice 1 build (Step 9+) and revisit with focused perf/debug pass
  - Revisit plan:
    - isolate map container from parent rerenders entirely
    - profile paint/layout in browser Performance panel
    - test throttled update cadence (2-4 Hz) vs interpolation quality
    - verify no duplicate dev servers/sockets are active during test

## Related

- [[CURSOR_TASKS]]
- [[Plans/Task List]]
