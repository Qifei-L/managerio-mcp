# Deploy Evertrust Books on Railway

This repository now has a standalone Node.js 24 HTTP server. Railway builds the root Dockerfile and starts `node server/index.mjs`. The existing accounting Worker remains usable on its original host.

## Create the service

1. In Railway, create a service from `Qifei-L/managerio-mcp`, branch `main`.
2. Attach a persistent volume to this service at `/data`. Keep one replica. The SQLite adapter stores encrypted connections, drafts, cache snapshots and ETag-protected execution leases on that volume. Railway startup deliberately fails if the volume is missing or `DATA_DIR` is outside it.
3. Generate a public HTTPS domain in Networking. Set `PUBLIC_URL` to its origin, for example `https://your-service.up.railway.app`. When `PUBLIC_URL` is unset, the server can use Railway's `RAILWAY_PUBLIC_DOMAIN`. Do not leave the local `.env.example` URL in production.
4. Set the variables below in Railway, then deploy. Never commit their values.

| Variable | Required value |
| --- | --- |
| `APP_AUTH_TOKEN` | A random secret of at least 32 characters, with no whitespace or colons. Used to authenticate this MCP service, separate from Manager tokens. |
| `MANAGER_TOKEN_ENCRYPTION_KEY` | A different random 32-byte value encoded as 64 lowercase hexadecimal characters. Keep it stable across deployments and backed up securely. |
| `MANAGER_API_BASE` | Your Manager Cloud HTTPS API origin ending in `/api2`, e.g. `https://your-company.manager.cloud/api2`. No credentials or query string in the URL. |
| `PUBLIC_URL` | Your Railway/custom HTTPS origin, unless relying on `RAILWAY_PUBLIC_DOMAIN`. |
| `DATA_DIR` | `/data` (Docker default), inside the mounted volume. |
| `APP_USER_ID` | Optional stable namespace, default `railway-owner`. Do not change after adding connections. |
| `PORT` | Railway supplies it. The server binds to `0.0.0.0`. |

Generate each secret separately on a trusted local machine:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The database records an encryption-key fingerprint. A changed encryption key blocks startup instead of silently losing access to old records. `APP_AUTH_TOKEN` can be rotated without changing the namespace or encryption key.

## Connect

### Accounts

- The service has user accounts. Each user's Manager company connections are private to that user: the signed-in user id is the data namespace passed to the accounting worker, and caller-supplied `oai-authenticated-user-id` headers are discarded.
- **First admin.** On first start the original owner (`APP_USER_ID`, default `railway-owner`) becomes an admin account named `APP_ADMIN_USERNAME` (default `admin`). Its existing company connections and OAuth grants carry over. Until the admin sets a password on the **Account** page, they sign in with `APP_AUTH_TOKEN`.
- **Registration.** `/register` creates a pending account. An admin approves or rejects it on `/admin`. Pending and suspended accounts cannot sign in or use tokens. At most 200 accounts can be pending at once.
- **Sign-in.** `/login` takes a username and password (scrypt hashes in SQLite). Five failed attempts lock that username for 15 minutes. Sessions last eight hours, are stored in SQLite (they survive restarts) and use an HttpOnly, SameSite=Lax cookie (Secure on HTTPS). Every state-changing browser request must carry this service's exact `Origin`.
- **Admin actions** (`/admin`): approve, reject, suspend, activate, make admin, remove admin, reset password (shows a one-time temporary password; the user is asked to change it), and view or revoke any user's tokens and authorized apps. Admins cannot suspend or demote themselves, and the last active admin is protected. Admins see each user's company count, never their Manager tokens or company data.
- **Password changes** sign out the user's other browsers; personal tokens and authorized apps keep working. Suspension and admin password resets rotate the user's security stamp, which also revokes their OAuth grants.

### MCP clients

- MCP endpoint: `https://your-service.up.railway.app/mcp` (stateless Streamable HTTP: POST JSON-RPC, 202 for notifications, GET returns 405).
- **OAuth (recommended).** In Claude choose **Sign in now → Register automatically**; in ChatGPT choose **OAuth** with dynamic client registration and leave client ID/secret empty. The authorization page sends signed-out users to `/login` and back, then shows which account is being connected. Grants belong to the user who approved them. Clients receive one-hour access tokens and rotating 30-day refresh tokens; refresh-token reuse revokes the family. Users see and revoke their apps on **MCP access**.
- **Personal access tokens.** Created on **MCP access** with a name and an expiry (30/90/365 days or never), shown once, stored as hashes, revocable. Use them as `Authorization: Bearer ebk_…`. Personal and OAuth tokens can only call `/mcp`; they cannot open the browser pages or account APIs.
- **Legacy master credential.** While `APP_LEGACY_BEARER` is `on` (the default), `Authorization: Bearer APP_AUTH_TOKEN` (and Basic `admin:APP_AUTH_TOKEN`) still act as the first admin, so existing clients keep working. Move them to OAuth or personal tokens, then set `APP_LEGACY_BEARER=off`. The master credential is no longer displayed on any page.
- Rotating `APP_AUTH_TOKEN` or changing `APP_USER_ID` invalidates all OAuth grants.
- Public endpoints: `/healthz`, OAuth discovery (`/.well-known/oauth-protected-resource`, `/.well-known/oauth-protected-resource/mcp`, `/.well-known/oauth-authorization-server`), `/oauth/register`, `/login` and `/register`. Dynamic client registration is capped at 1,000 clients; clients older than seven days with no token, code or pending authorization are removed.

### HTTP API

| Route | Who | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` | anyone | `{username, password}` → pending account |
| `POST /api/auth/login`, `POST /api/auth/logout` | anyone / session | Browser session (`POST /login` with only `{password}` still signs in the admin) |
| `GET /api/auth/me`, `POST /api/auth/password` | session | Current user; `{current_password, new_password}` |
| `GET /api/tokens`, `POST /api/tokens`, `DELETE /api/tokens/:id` | session | Own personal tokens and authorized apps; `{name, expires_days}` |
| `DELETE /api/oauth/grants/:id` | session | Revoke one authorized app |
| `GET /api/admin/users`, `POST /api/admin/users/:id` | admin | List users; `{action}` |
| `GET /api/admin/users/:id/access`, `DELETE …/tokens/:tid`, `DELETE …/grants/:gid` | admin | A user's tokens and apps |
| `/api/connections…` | session | The user's own Manager company connections |
| `/api/performance`, `/api/execution` | admin | Diagnostics |

## Continuous delivery

### Read/write execution separation

The existing Railway service keeps one public MCP address, one replica and its existing volume. `server/read-service.mjs` handles reads and gateway connection management. `server/write-service.mjs` runs in a separate long-lived Node worker thread with its own event loop and SQLite handle. `server/execution.mjs` routes MCP tool calls by their deployed `readOnlyHint`; unknown or mutable tools enter the write lane. Browser COA mutations also enter that lane. Authentication and owner identity are checked by the gateway before dispatch.

Only one write-lane call executes at a time across all companies. Additional concurrent calls receive HTTP 503 with `retryable:true` before dispatch. Startup, crash and ambiguous timeout failures return `retryable:false` with a reconciliation notice; no financial operation is automatically replayed. An executor timeout does not cancel an upstream write or free its capacity slot: it remains occupied until the actual result or thread exit. Graceful server shutdown drains HTTP requests before terminating the executor. Existing encrypted task checkpoints, approval hashes, leases and read-back checks remain authoritative. This is execution isolation, not a new durable batch queue or unattended job system.

Both handles use the same local WAL database. Persisted snapshot-generation invalidation is visible across threads; write preconditions and read-back still use fresh Manager reads. Authenticated `GET /api/execution` reports executor readiness/capacity. Forwarded responses have `X-Execution-Lane: read|write`; performance samples include `execution_lane` and merged executor timings. Connection setup/preferences stay in the gateway and may modify local storage despite their `read` execution-lane label.

This release does **not** create two independently deployed Railway services. It isolates write-side synchronous JavaScript work; it does not accelerate Manager's network requests, eliminate SQLite contention or protect against a whole-container failure. Moving to independent containers requires shared durable storage (for example PostgreSQL); a Railway volume/WAL file must not be treated as a distributed database. No Redis or new infrastructure is required for this stage. See [Node worker threads](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html) and [SQLite WAL constraints](https://sqlite.org/wal.html).

### Performance inspection

Authenticated `GET /api/performance` reports the last 500 completed requests in the current process, p50/p95 server duration and 30 recent samples. Railway logs receive numeric request/storage/crypto/Manager durations and call counts. Worker responses include `Server-Timing`. No credentials, request parameters, company IDs, document contents or upstream response bodies are logged. The metrics window resets on restart; it is not a durable monitoring service. Operation durations can overlap during parallel work and are not necessarily additive. Manager duration includes fetch headers and reading its response body; network time between the client and Railway is outside server duration.

Selected-company calls read and decrypt only the specified connection, retaining owner scoping, removal checks, legacy migration and fresh record reads. AES keys are imported once per request; connection records and write preconditions are not cached across requests.

GitHub Actions runs all regression suites, Railway adapter tests, artifact validation and a Docker build on pushes to `main` and pull requests. Connect Railway to this repository's `main` branch and enable GitHub autodeploys plus **Wait for CI** in service settings. After that, a successful push can deploy automatically; no Railway token belongs in GitHub Actions.

Adding `railway.json` does not create a Railway project, mount its volume, configure secrets or enable Wait for CI. Those are service settings. This source migration does not deploy over the original Evertrust Books service. Source pushes after Railway autodeploy is enabled are deployment actions and should follow your release policy.

Official references: [GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys), [config as code](https://docs.railway.com/config-as-code/reference), [volumes](https://docs.railway.com/volumes), [healthchecks](https://docs.railway.com/deployments/healthchecks).

## Local verification and operations

```sh
# Node.js 24; Python with openpyxl and lxml is required only for regression tests.
cp .env.example .env
# Fill in the two secrets and MANAGER_API_BASE; leave PUBLIC_URL at localhost.
npm run dev
npm test
npm run build
npm run validate
docker build -t managerio-mcp .
```

`npm start` reads process environment; `npm run dev` additionally reads `.env`. If Python isn't named `python`, set `PYTHON` to its executable path for the tests. There are no production npm dependencies.

Do not store live tokens, database files or `.env` in GitHub. Back up the volume and encryption key together using a secure mechanism. SQLite must run on one mounted volume and one replica; it is not shared storage for a horizontally scaled service. A volume-backed redeploy can briefly interrupt availability. Graceful termination drains requests for up to 110 seconds; the host's termination grace also matters. Interrupted writes must be reconciled using the saved task, never automatically replayed.

Existing cloud connections and task data are not in the exported source ZIP and are not migrated automatically. Add the required Manager tokens to the new service after deployment. Local mock tests do not prove live Manager writes or a successful Railway deployment; verify the deployed health endpoint, authentication and MCP initialize/list before using real accounts.
