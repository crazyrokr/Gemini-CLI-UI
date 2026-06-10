# ADR-001: Test Coverage Infrastructure

## Status: Accepted

## Date: 2026-06-10

## Context

The project had zero test coverage — no test framework, no test files, no CI integration. The user's CLAUDE.md requires full unit test coverage with Given-When-Then structure, edge cases, and false-positive focus.

## Decision

1. **Framework**: Vitest was chosen as the test framework because it natively integrates with Vite (the project's build tool), provides first-class jsdom support for React component testing, and has Jest-compatible mocking APIs (`vi.*`).

2. **Directory structure**: Tests are organized in a separate `tests/` directory tree mirroring the source structure (`tests/frontend/utils/`, `tests/server/routes/`, etc.) rather than co-located test files.

3. **Testing tiers**: Tests are prioritized in 5 tiers:
   - Tier 1: Pure functions (zero mocking) — highest ROI
   - Tier 2: Stateful utilities (light mocking)
   - Tier 3: React hooks (jsdom + RTL)
   - Tier 4: React components (jsdom + RTL + userEvent)
   - Tier 5: Server routes (supertest + Express)

4. **Refactoring**: `computeLanes()` was extracted from `src/workers/graphWorker.js` into `src/workers/computeLanes.js` for testability, then imported back by the worker.

5. **Setup file**: `tests/setup/frontend.js` provides browser API stubs (class-based mocks for ResizeObserver, AudioContext, MediaRecorder, WebSocket, IntersectionObserver) guarded by an `isJsdom` check to avoid errors in `@vitest-environment node` test files.

## Consequences

- **Positive**: 245 tests across 25 test files covering pure functions, utilities, hooks, components, middleware, and server routes. All tests follow Given-When-Then structure.
- **Positive**: Reusable skill `cover-javascript-project-with-tests` created for future projects.
- **Trade-off**: Overall coverage is ~10% because many large UI components (Sidebar, Shell, IDETab, ChatInterface) remain untested — they require complex context providers and mocking of Monaco/xterm.
- **Trade-off**: `bun:sqlite` is mocked in server tests, so database tests don't exercise the real SQLite layer.
