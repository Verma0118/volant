---
date: 2026-04-24
type: reference
tags: [workflow, cursor, claude-code, tools]
---

# Tool Split — Claude Code vs Cursor

## Mental Model

- **Claude Code** = the brain (plans, researches, orchestrates, writes to vault, runs MCP tools)
- **Cursor** = the hands (writes and edits code, implements specs, debugs, iterates on UI)

They communicate via `CURSOR_TASKS.md` at repo root.

---

## Claude Code Owns

| Task | Why |
|------|-----|
| Vault writing (Sessions, Plans, Strategy, Research) | Needs MCP memory + session continuity |
| Architecture decisions | Needs full project context, blueprint skill |
| Research (Exa MCP, web search) | MCP tools not available in Cursor |
| Email / outreach drafts | brand-voice + investor-outreach skills |
| Pitch deck content | investor-materials + market-research skills |
| Git commits + push | Session-level coordination |
| Task list updates | Tracks across sessions |
| Initial scaffolding briefs | Writes CURSOR_TASKS.md with full specs |
| Multi-file refactors that span platform + vault | Needs global view |
| Debugging architectural issues (Redis SPOF, schema decisions) | Needs domain knowledge |
| `search-first` research before new steps | Verifies patterns before Cursor implements |

---

## Cursor Owns

| Task | Why |
|------|-----|
| Writing code inside `platform/` | Autocomplete, inline errors, fast iteration |
| Implementing components from specs | Cursor Composer = fastest for boilerplate |
| CSS / styling iteration | Real-time preview + inline edit |
| Debugging runtime errors | Terminal + file context in one view |
| `docker-compose.yml`, `package.json`, config files | Autocomplete-heavy |
| Verifying exit criteria (running commands) | Local terminal access |
| UI component generation (with magic-mcp via `/ui`) | Component generation flow |
| Refactoring within a single file | Cursor inline edit superior |

---

## Handoff Protocol

```
Claude Code                          Cursor
───────────                          ──────
1. Research step (search-first)  →
2. Write task brief              →   3. Read CURSOR_TASKS.md
                                     4. Implement + verify exit criteria
                                     5. Mark ✅ in CURSOR_TASKS.md
6. Read completion ←
7. Update Task List.md
8. Brief next step               →   ...repeat
```

---

## What NOT to do in Cursor

- Don't write to vault files (Sessions/, Plans/, Strategy/) — Claude Code owns those
- Don't make architecture decisions — ask Claude Code via a new session
- Don't hardcode colors, coordinates, or seed data outside designated files
- Don't commit + push — Claude Code handles git at session boundaries

## What NOT to do in Claude Code

- Don't try to run long UI iteration loops — switch to Cursor for that
- Don't write boilerplate line-by-line — hand off to Cursor with a spec

---

## Related
[[_BRIEFING]] · [[CURSOR_TASKS]] · [[Plans/Task List]] · [[Plans/slice-1-fleet-overview]]
