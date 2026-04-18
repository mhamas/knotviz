# CLAUDE.md

**Read `CONTRIBUTING.md` first.** It is the authoritative engineering reference for this repo — tech stack, file structure, testing rules, performance rules, UI component library, JSDoc rules, error handling, and scope boundaries. That file is tool-agnostic and applies to any coding agent (Claude, Cursor, Copilot, Codex, etc.) and to human contributors.

The notes below are **Claude-specific** addenda to what's in `CONTRIBUTING.md`. They reference Claude Code tool names (MCP servers, etc.) and would not make sense in a contributor-facing document.

---

## Visual verification with Playwright MCP

When implementing UI components or making visual changes, use the Playwright MCP tools to verify the rendered output in a real browser. This closes the feedback loop without waiting for the user to manually check.

1. Start the dev server (`npm run dev`) if not already running.
2. `browser_navigate` to `http://localhost:5173/graph` (graph app) or `http://localhost:5173/` (homepage).
3. `browser_snapshot` to inspect DOM and verify component rendering.
4. After code changes, `browser_navigate` again to refresh and re-check.

Use for: layout issues, component visibility, drag-and-drop flows, tooltip positioning, filter UI state, canvas rendering. Do NOT rely solely on unit tests for UI correctness.

---

## Task workflow reminder

After completing a task:

1. Write the tests mandated by `CONTRIBUTING.md` (unit / component / E2E as appropriate).
2. Run `npm run test:all` — must pass with zero errors.
3. Do not commit if any test fails. Fix the issue first.
4. For UI changes, use Playwright MCP (above) to verify the rendered output.
5. If the change warrants manual user testing, tell the user what to exercise and how (e.g. "run `npm run dev` and drag a JSON file onto the drop zone").
6. Commit and push only when the user explicitly asks.
