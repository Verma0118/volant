# Unfinished Tasks

Carry-forward items that are known issues but not blockers for current build momentum.

## Open

- [ ] Frontend bundle-size optimization pass (non-blocking)
  - Context: Vite build passes but warns main chunk exceeds 500 kB.
  - Goal: reduce initial JS payload before broader team onboarding.
  - Plan:
    - lazy-load route views (`FleetMap`, `FleetStatus`) with `React.lazy`
    - split map-specific dependencies from initial route load where possible
    - re-run `npm run build` and compare chunk/gzip output
    - keep current chunk warning threshold unless payload remains intentionally large

- [ ] Slice 2 kickoff brief and Step 1 task breakdown
  - Goal: move from Slice 1 hardening into Mission Dispatch implementation.
  - Deliverables:
    - architecture + queue model brief
    - `CURSOR_TASKS.md` Step 1 executable checklist
    - implementation start notes for Cursor handoff

## Related

- [[CURSOR_TASKS]]
- [[Plans/Task List]]
