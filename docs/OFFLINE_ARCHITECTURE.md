# Offline-First Architecture

EdaCleaner’s desktop app is offline-first: local PC tools work without the network, while API mutations and auth/subscription state survive outages and recover automatically.

## Goals

- Keep authenticated users productive during temporary internet failures
- Persist work safely across crashes and quit
- Sync queued mutations when connectivity returns
- Never expose secrets (JWT / refresh tokens) to the renderer
- Run the same code path on Windows, macOS, and Linux

## High-level flow

```
Renderer (React)
    │  preload IPC only (contextIsolation)
    ▼
Main process
    ├── AuthSessionService      → secure tokens + profile/permissions
    ├── SubscriptionSession     → plan / expiry / features / trial cache
    ├── ApiClient               → online fetch | cache | offline queue
    ├── ConnectivityService     → online/offline probe
    ├── SyncEngine              → flush queue (sequential, backoff)
    └── DatabaseManager (sql.js)→ KV / cache / secure / request_queue
```

## Layers

### 1. Local database (`userData/data/eda-cleaner.db`)

| Store | Purpose |
|-------|---------|
| `kv_store` | Non-secret app state (settings, auth profile, subscription snapshot) |
| `cache_store` | TTL API response cache |
| `secure_store` | Encrypted secrets (access + refresh tokens) via `safeStorage` or AES-GCM fallback |
| `request_queue` | Durable offline mutations |

**Integrity & backup**

- Atomic persist: write `.tmp` → rename
- Debounced flush (250ms) with `unref` timers
- `PRAGMA integrity_check` on open
- Last-good backup: `eda-cleaner.db.bak`
- Corrupt primary → quarantine → restore from backup → else empty DB
- Orphan `.tmp` cleanup on init

### 2. Secure storage

- Prefer OS encryption (`safeStorage`: DPAPI / Keychain / libsecret)
- Linux fallback: AES-256-GCM with a local key file (`chmod 600` where supported)
- Renderer cannot read/write secure keys (IPC locked down to `secure.info` only)

### 3. API client (offline-aware)

| Condition | Behavior |
|-----------|----------|
| Online + success | Optional GET cache write |
| Online + transient failure | Retry; may enqueue mutating requests |
| Online + permanent 4xx | Fail (never enqueue) |
| Offline + GET | Serve cache or `cache_miss` |
| Offline + mutation | Enqueue → `202` `{ queued, requestId }` |

Auth: main injects Bearer from `AuthSessionService`. On `401`, refresh once and retry.

**IPC hardening:** relative API paths only (no absolute URLs / SSRF), no renderer `authToken`, stripped `Authorization` headers, body/timeout caps.

### 4. Offline queue

- Methods: `POST` / `PUT` / `PATCH` / `DELETE`
- Fingerprint dedupe + `Idempotency-Key`
- Secrets stripped from persisted headers
- Caps: 500 active items, 256KB body
- Statuses: `pending` → `processing` → `completed` \| `failed` \| `cancelled` \| `abandoned`
- Crash recovery: `processing` → `pending` on boot
- Exhausted retries → `abandoned` (dead-letter; excluded from sync)
- Retention cleanup for terminal rows (14 days), on boot + periodic maintenance

### 5. Sync engine

- Triggers: connectivity restored (debounced), background poll, manual IPC
- Sequential batches with event-loop yield (UI stays responsive)
- Exponential backoff + jitter
- Conflict rules (404 DELETE / 409 POST / client_wins upsert / 401-403 permanent)
- Concurrent sync requests coalesce via `resyncRequested` follow-up pass
- Fresh access token injected at replay time (not stored in queue)

### 6. Auth & subscription (offline session)

Persisted locally:

- JWT + refresh token (secure)
- User profile, permissions (KV)
- Subscription: plan, expiry, features, trial (KV)

| Mode | Behavior |
|------|----------|
| Offline | Session remains valid until refresh expiry |
| Online | Auto-refresh tokens; sync `/auth/me` + `/subscription/status` |

Server: `/auth/login|register|refresh|logout|me`, `/subscription/status`.

### 7. Renderer integration

- `useOfflineEngine` (AppShell) subscribes to network / sync / auth IPC
- Sidebar status card: Online / Offline / Synchronizing / pending / queued / last sync
- No workflow changes for local PC tools

## Lifecycle

1. **Boot:** `bootstrap` → `initializeOfflineFoundation` → IPC → window  
   Recover queue, purge cache, start connectivity + sync + auth handlers, maintenance timer
2. **Quit:** `before-quit` preventDefault → await `shutdownOfflineFoundation`  
   Cancel sync, dispose auth, purge/cleanup, persist + backup DB, `app.exit(0)`

## Security summary

| Control | Implementation |
|---------|----------------|
| IPC boundary | Preload only; validated handlers |
| Tokens | Main-only secure storage |
| Queue | No Authorization in DB / IPC list redacted |
| API | Relative paths; HTTPS required when packaged |
| Namespaces | `auth` / `subscription` protected from renderer clear/write |
| Logging | Leveled + redaction; file sink under `userData/logs` when packaged |

## Cross-platform notes

| Platform | Notes |
|----------|-------|
| Windows | DPAPI via `safeStorage`; `chmod` no-op (handled) |
| macOS | Keychain via `safeStorage` |
| Linux | Often AES fallback; treat as first-class |
| All | sql.js WASM via `require.resolve`; paths via `path.join` |

## Operations

- Log level: `EDA_LOG_LEVEL=debug|info|warn|error`
- Dev file logs: `EDA_LOG_FILE=1`
- Packaged builds **must** set `SERVER_API_BASE_URL` to an `https://` API base
- DB path: `{userData}/data/eda-cleaner.db`
- Backup: `{userData}/data/eda-cleaner.db.bak`

## Scalability posture

- Sequential sync avoids write races; batch size tunable
- Queue/body caps prevent unbounded growth
- Periodic cache + queue cleanup
- sql.js is in-memory with export-to-disk; suitable for desktop queue/auth caches. Native SQLite remains a future option if DB size grows large (warn at 64MB).

## Key modules

| Path | Role |
|------|------|
| `electron/main/services/offline/` | DB, queue, sync, connectivity, cache, secure |
| `electron/main/services/api/` | Offline-first HTTP client |
| `electron/main/services/auth/` | Session + subscription cache |
| `electron/main/events/index.ts` | Safe shutdown |
| `renderer/hooks/useOfflineEngine.ts` | UI status binding |
| `docs/OFFLINE_ARCHITECTURE.md` | This document |
