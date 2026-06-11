# ADR-002: Migrate Runtime from Bun to Node.js

## Status: Accepted

## Date: 2026-06-11

## Context

The Home Assistant addon (`ha-gemini-cli`) runs the server under the Bun runtime. When the server spawns bash processes via `node-pty`, the child process exits immediately with SIGHUP (signal 1, exit code 0). This makes the web-based terminal feature completely non-functional.

Root cause analysis traced the issue to an ABI mismatch:

1. The Dockerfile runs `npm install`, which compiles `node-pty` (a native addon using `nan`/libuv) against Node.js V8 headers.
2. The server runtime is Bun (driven by `package.json` scripts: `bun run server:dev`, `bun server/index.js`).
3. Bun's support for `nan`-based native addons is incomplete — specifically the `uv_poll` integration that `node-pty` uses to monitor the PTY master file descriptor.
4. The master FD is not registered with Bun's event loop, causing the kernel to see it as closed and send SIGHUP to the child.

The only hard Bun dependency in the codebase is a single import: `import { Database } from 'bun:sqlite'` in `server/database/db.js`. No other Bun-specific APIs (`Bun.*` globals, `bun:` imports) are used anywhere.

## Decision

1. **Replace `bun:sqlite` with `better-sqlite3`** in `server/database/db.js`. The APIs are identical (`new Database(path)`, `.exec()`, `.prepare().get()`, `.prepare().run()`, `.lastInsertRowid`), requiring only the import line to change.

2. **Switch all `package.json` scripts from `bun` to `node`/`npm`**:
   - `bun run server:dev` → `npm run server:dev`
   - `bun server/index.js` → `node server/index.js`
   - `bun --watch server/index.js` → `node --watch server/index.js`
   - `bun run build && bun run server` → `npm run build && npm run server`

3. **Add `better-sqlite3` as a direct dependency** (was already present as a transitive dependency).

4. **Add unit tests for `server/database/db.js`** — the module previously had zero direct test coverage (only indirect coverage through mocked auth route tests).

## Consequences

- **Positive**: `node-pty` operates with full native addon support under Node.js, resolving the SIGHUP issue that made the web terminal non-functional.
- **Positive**: Removing the Bun dependency simplifies the deployment story — one fewer runtime to install in the Docker image.
- **Positive**: Direct database unit tests provide regression safety for the auth layer.
- **Trade-off**: `node --watch` (Node 20+) is slightly slower to restart than `bun --watch`, but this only affects development ergonomics, not production behavior.
