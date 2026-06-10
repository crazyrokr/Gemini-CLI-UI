# Implementation Plan: OIDC Integration with Pocket ID

## Objective
Integrate Pocket ID as an OIDC provider in the Gemini-CLI-UI-fork project, allowing users to authenticate using their Pocket ID credentials.

## Background & Motivation
The current authentication mechanism is JWT-based. To improve security and enable centralized identity management, we will implement OpenID Connect (OIDC) support, utilizing Pocket ID as the identity provider (IdP).

## Scope & Impact
- **Backend:**
    - Update `server/routes/auth.js` to include OIDC callback and login routes.
    - Update `server/middleware/auth.js` to handle OIDC session validation.
    - Create `server/services/oidcService.js` for OIDC protocol logic.
    - Create a database migration to support OIDC user records.
    - Introduce environment variables for OIDC configuration (`OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_ISSUER_URL`, `OIDC_REDIRECT_URI`, `FRONTEND_URL`).
- **Frontend:**
    - Update `src/contexts/AuthContext.jsx` to support OIDC login flow.
    - Update `src/components/LoginForm.jsx` to add a "Login with Pocket ID" button.

## Proposed Solution
We will use a standard OIDC library for Node.js (`openid-client@^5`, CJS-compatible) to implement the OAuth2 authorization code flow with PKCE.

1. **Authorization Request:** Client redirects user to Pocket ID authorize endpoint with `scope=openid email profile`, `client_id`, `redirect_uri`, `state`, `nonce`, `code_challenge`, and `code_challenge_method=S256`.
2. **Callback:** Pocket ID redirects back to `/auth/oidc/callback` with an `authorization_code` and `state`.
3. **State & Nonce Validation:** Backend validates `state` against the session-bound value (CSRF protection) and prepares to validate `nonce` from the ID token.
4. **Token Exchange:** Backend exchanges `authorization_code` and `code_verifier` for `id_token` and `access_token` at Pocket ID's token endpoint, with a 5-second timeout.
5. **ID Token Validation:** Backend validates `id_token` signature, `iss`, `aud`, `nonce`, and `exp`.
6. **User Mapping:** Backend maps OIDC claims (`sub`, `email`) to a local user record (creating one if it does not exist).
7. **Session Creation:** Backend issues a one-time-use reference token, redirects the frontend to a callback URL with this reference, and the frontend exchanges it for the real JWT via an API call.

## Implementation Steps

### 1. Environment Configuration
- Add new keys to `.env.example`:
  - `OIDC_CLIENT_ID` — Pocket ID client identifier
  - `OIDC_CLIENT_SECRET` — Pocket ID client secret
  - `OIDC_ISSUER_URL` — Pocket ID issuer URL (e.g., `https://pocketid.example.com`)
  - `OIDC_REDIRECT_URI` — Callback URL (e.g., `https://your-app.example.com/api/auth/oidc/callback`)
  - `FRONTEND_URL` — Frontend origin for CORS and post-login redirects (e.g., `http://localhost:4009`)
- Update application configuration loader to ingest these variables.
- Validate all OIDC env vars at startup with clear error messages if missing.

### 2. Database Migration
The current `geminicliui_users` schema has `password_hash TEXT NOT NULL`, which blocks OIDC-only users. A migration is required.

- Create `server/database/migrations/001_oidc_columns.sql`:
  ```sql
  -- Make password_hash nullable for OIDC-only users
  -- SQLite does not support ALTER COLUMN; recreate the table.

  CREATE TABLE IF NOT EXISTS geminicliui_users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      email TEXT,
      oidc_subject TEXT,
      oidc_issuer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1
  );

  INSERT INTO geminicliui_users_new (id, username, password_hash, created_at, last_login, is_active)
      SELECT id, username, password_hash, created_at, last_login, is_active
      FROM geminicliui_users;

  DROP TABLE geminicliui_users;
  ALTER TABLE geminicliui_users_new RENAME TO geminicliui_users;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON geminicliui_users(username);
  CREATE INDEX IF NOT EXISTS idx_users_is_active ON geminicliui_users(is_active);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oidc_subject_issuer ON geminicliui_users(oidc_subject, oidc_issuer);
  ```
- Run the migration at server startup before the database is used.
- Define an account linking strategy: if an OIDC user's email matches an existing username, require the user to log in with their password first, then link the OIDC identity. Do **not** auto-link.

### 3. Backend Implementation

#### 3a. Dependencies
- Install `openid-client@^5` (v5 is CJS-compatible; v6+ is ESM-only and untested with Bun).
- Install `cookie-parser` for handling the reference-token cookie in the callback flow.
- Verify Bun compatibility before implementation (`bun add openid-client@5 && bun test`).

#### 3b. OIDC State Store (`server/services/oidcStateStore.js`)
Store `code_verifier`, `state`, and `nonce` server-side instead of in cookies.

- In-memory `Map` with TTL-based auto-cleanup (e.g., 10-minute expiry).
- Each entry keyed by a random session ID.
- Exports: `createStateEntry()` → returns session ID + stored values, `consumeStateEntry(sessionId)` → returns stored values and deletes the entry (one-time use).

#### 3c. OidcService (`server/services/oidcService.js`)
- **Discovery:** Fetch `.well-known/openid-configuration` once at startup, cache the result, re-discover on failure with a 24-hour TTL. Do **not** block server startup — fail OIDC routes gracefully if discovery hasn't completed.
- **`getAuthorizationUrl(sessionId)`**: Generate `state`, `nonce`, `code_verifier` + `code_challenge`. Store them in the state store keyed by `sessionId`. Return the full authorization URL.
- **`handleCallback(code, sessionId)`**: Retrieve `code_verifier`, `state`, `nonce` from the state store. Exchange `code` + `code_verifier` for tokens with a 5-second timeout. Validate `id_token` signature, `iss`, `aud`, `nonce`, `exp`. Return verified claims.
- **`mapUser(claims)`**: Find or create a local user from OIDC claims (`sub`, `email`, `name`). Apply the account linking strategy defined in step 2.

#### 3d. Route Enhancements (`server/routes/auth.js`)
Apply rate limiting (10 req/15 min) to both new routes.

- **`GET /auth/oidc/login`**:
  1. Generate a random session ID.
  2. Call `oidcService.getAuthorizationUrl(sessionId)`.
  3. Set a cookie: `oidc_session=<sessionId>; HttpOnly; SameSite=Lax; Secure; Max-Age=600; Path=/api/auth/oidc`.
  4. Redirect (302) to the authorization URL.
- **`GET /auth/oidc/callback`**:
  1. Read `oidc_session` cookie, validate session ID.
  2. Validate `state` query parameter matches the stored value.
  3. Call `oidcService.handleCallback(code, sessionId)`.
  4. Map OIDC user to local user via `oidcService.mapUser(claims)`.
  5. Generate a one-time-use reference token (32 random bytes, hex).
  6. Store `{ referenceToken, jwt }` in a short-lived Map (60-second TTL).
  7. Redirect (302) to `${FRONTEND_URL}/auth/oidc/callback?ref=<referenceToken>`.
  8. Audit log: `oidc_callback_success` or `oidc_callback_failed`.

- **`POST /auth/oidc/exchange`**:
  1. Accept `{ referenceToken }` in the request body.
  2. Look up the reference token in the short-lived Map. Delete it immediately (one-time use).
  3. If found, return the JWT in the response body (same format as `/auth/login`).
  4. If not found, return 401.
  5. Audit log: `oidc_token_exchanged`.

#### 3e. Middleware Updates
- **CORS lockdown (`server/index.js`)**: Replace `app.use(cors())` with:
  ```js
  cors({ origin: process.env.FRONTEND_URL, credentials: true })
  ```
- **Cookie parser**: Add `app.use(cookieParser())` before auth routes.
- **`authenticateToken`**: No changes needed — it validates JWTs regardless of how the user was created. OIDC users and password users both receive the same JWT structure.
- **Logout enhancement**: On `POST /auth/logout`, if the user has an associated OIDC session, redirect to Pocket ID's `end_session_endpoint` (discovered at startup). Store `id_token_hint` server-side (encrypted) for this purpose.

### 4. Frontend Implementation

#### 4a. Login Button (`src/components/LoginForm.jsx`)
- Add a "Login with Pocket ID" button below the existing form.
- On click: `window.location.href = '/api/auth/oidc/login'` (full navigation, not AJAX).

#### 4b. OIDC Callback Page
- Create `src/pages/OidcCallback.jsx` (or handle within existing routing):
  1. On mount, extract `ref` from `URLSearchParams`.
  2. `POST /api/auth/oidc/exchange` with `{ referenceToken: ref }`.
  3. On success: store JWT in `AuthContext`, redirect to dashboard.
  4. On failure: redirect to login page with error message.

#### 4c. AuthContext Updates (`src/contexts/AuthContext.jsx`)
- Add `oidcLogin` function that navigates to `/api/auth/oidc/login`.
- Handle the post-exchange token storage (same path as the existing `login` function).

### 5. Audit Logging
Add audit events for all OIDC operations:
- `oidc_login_initiated` — when user clicks "Login with Pocket ID"
- `oidc_callback_success` — successful token exchange + user mapping
- `oidc_callback_failed` — any failure in the callback (with reason)
- `oidc_token_exchanged` — frontend successfully exchanged reference token for JWT
- `oidc_account_created` — new local user created from OIDC claims
- `oidc_logout` — user logged out via OIDC end session endpoint

### 6. Error Handling
Define user-facing error states and HTTP responses:

| Scenario | HTTP Status | User-Facing Action |
|---|---|---|
| Pocket ID unreachable | 503 | Redirect to login with "Authentication service unavailable" |
| User denies consent | 302 | Redirect to login with "Authentication was cancelled" |
| Invalid or expired `state` | 400 | Redirect to login with "Session expired, please try again" |
| Invalid `id_token` (signature, nonce, etc.) | 401 | Redirect to login with "Authentication failed, please try again" |
| Authorization code already used | 400 | Redirect to login with "Session expired, please try again" |
| Reference token not found or expired | 401 | Return 401; frontend shows "Session expired, please log in again" |
| OIDC env vars missing at startup | N/A | Server logs error; OIDC routes return 503; native login still works |
| Discovery fails at startup | N/A | OIDC routes return 503 with retry-after; native login still works |

## Verification & Testing

### Unit Tests
- `OidcService` token exchange logic (mocking Pocket ID responses).
- `OidcStateStore` TTL-based cleanup and one-time-use semantics.
- JWT generation from OIDC user info (users without `password_hash`).
- Reference token exchange endpoint (valid token, expired token, reused token).
- `state` and `nonce` validation (missing, mismatched, replayed).
- Database migration (existing users preserved, new columns nullable).
- Account linking strategy (matching email → requires password confirmation).

### Integration Tests
- End-to-end OIDC flow with a mock IdP: login → callback → exchange → session → logout.
- Concurrent OIDC logins (state store isolation).
- Token expiration and renewal scenarios.
- IdP-down graceful degradation (native login still works).

### Security Tests
- CSRF: attempt callback with invalid or missing `state`.
- Replay: attempt to reuse `code_verifier` or `referenceToken`.
- Token injection: submit a forged `id_token`.
- Open redirect: attempt to redirect to an unauthorized URL.
- Rate limiting: exceed thresholds on `/auth/oidc/login` and `/auth/oidc/callback`.

## Migration & Rollback
- **Migration:** Database migration runs automatically at startup. Existing users are fully preserved. OIDC is an additive feature — native login continues to work.
- **Rollback:** Revert auth routes, middleware, and CORS changes. Remove `openid-client` and `cookie-parser` dependencies. The new database columns (`oidc_subject`, `oidc_issuer`, `email`) and nullable `password_hash` are harmless to leave in place. OIDC-created users will be unable to log in but won't break the system.
