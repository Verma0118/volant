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

- [ ] Slice 1 stabilization pass (before Slice 2)
  - Goal: debug and harden current Slice 1 runtime quality
  - Checklist:
    - dependency sanity checks and lockfile consistency
    - run lint/build/runtime verification across backend + frontend
    - validate simulator/demo-mode behavior end-to-end
    - fix remaining UX/perf rough edges discovered during validation
  - Owner: Claude + Cursor handoff tasks for next session
  - Note: save session only after Slice 2 kickoff is complete

## Related

- [[CURSOR_TASKS]]
- [[Plans/Task List]]
