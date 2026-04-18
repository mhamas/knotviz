# AGENTS.md

**Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first.** It is the authoritative engineering reference for this repo — tech stack, file structure, testing rules (including the **Red/Green TDD requirement for AI agents**), performance rules, UI component library, JSDoc rules, error handling, and scope boundaries. It applies to any coding agent (Claude, Cursor, Copilot, Codex, Aider, Cline, Zed AI, Jules, Windsurf, etc.) and to human contributors alike.

This file exists so that agents following the [agents.md](https://agents.md/) convention can discover the project's rules without extra configuration.

---

## Quick checklist before you make changes

1. Read `CONTRIBUTING.md` end-to-end.
2. Follow **Red/Green TDD** — write the failing test first, watch it fail, then implement. Required for all AI agents on this project.
3. Use the shared design system in `src/graph/components/sidebar/` for any sidebar/panel UI. Icons from `lucide-react` only.
4. Obey the **performance rules** (1M+ nodes). No `Math.min(...array)` spreads, no main-thread O(N) iteration, always `render(0)` after cosmos `set*` calls.
5. Run `npm run test:all` — zero errors — before claiming a task done. Do not commit if anything fails.
6. Keep commits focused; write descriptive messages explaining *why*.

---

## Agent-specific notes

Individual agent tools may have their own instruction file (for example, Claude Code reads `CLAUDE.md`). Those files are thin and point back here — `CONTRIBUTING.md` is the source of truth and is tool-agnostic. If you add tool-specific guidance, put it in that tool's own file, not here.
