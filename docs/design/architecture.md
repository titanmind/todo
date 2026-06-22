# Architecture

## Scope
- In: auth flow, data sync strategy, mutation pipeline, PWA shell, auto-update mechanism
- Out: UI component details (see [interactions.md](interactions.md)), data schema (see [data_model.md](data_model.md))

## Vocabulary
- **PKCE**: Proof Key for Code Exchange; prevents authorization code interception without requiring a confidential client
- **Refresh token**: long-lived credential stored in localStorage; exchanged for new access tokens via `fetch` to Google's token endpoint — no popup, no user interaction
- **Drive file**: the single `todo-data.json` on the user's Google Drive
- **Mutation**: any operation that changes app state (create, edit, delete, reorder, toggle, archive, restore)
- **Optimistic render**: apply mutation to local `data` and call `render()` before Drive write completes

## Auth flow

```
Page load
  ├─ URL has ?code= (returning from OAuth redirect)
  │   └─ exchangeCode() → POST token endpoint with code + code_verifier
  │       └─ Store access_token + refresh_token → onAuthSuccess()
  ├─ localStorage has refresh token
  │   └─ silentRefresh() → POST token endpoint with refresh_token
  │       ├─ Success → onAuthSuccess()
  │       └─ Failure (revoked) → clear tokens, show login
  ├─ localStorage has valid access token (expiry > 60s away)
  │   └─ onAuthSuccess()
  └─ No valid session
      └─ Show "Sign in with Google" button
          └─ Click → startAuth() → redirect to Google with PKCE challenge
```

- Access token stored: `localStorage['todo_access_token']` → `{ token, expiry }`
- Refresh token stored: `localStorage['todo_refresh_token']` → raw string; persists across sessions indefinitely until revoked
- PKCE verifier stored: `sessionStorage['todo_pkce_verifier']` → survives redirect, scoped to tab
- Mid-request 401 → invalidate token, `ensureToken()` (uses refresh token), retry once
- `ensureToken()` deduplicates concurrent refresh attempts via shared `tokenPromise`
- `client_secret` included in token exchange; required by Google for web application client types; security relies on redirect URI validation + PKCE, not secret confidentiality

## Sync strategy

Three triggers only; no polling:

1. **Visibility change** — `document.visibilitychange` when app gains focus → `refreshData()` (read + render)
2. **Mutation** — every state change → optimistic render → background write via `mutationQueue`
3. **Manual refresh** — refresh button in topbar → `refreshData()`

## Mutation pipeline

```
mutate(fn):
  1. fn()           // apply to local `data`
  2. render()       // optimistic UI
  3. queue:
     a. writeToDrive(data)
     b. on error → readFromDrive() → render()  // rollback to authoritative state
```

- `mutationQueue` is a Promise chain; writes never overlap
- `fn()` runs synchronously on current `data`; captures IDs from closure for fresh lookups
- Write failure triggers re-read; local state corrected silently

## Drive file lifecycle

```
onAuthSuccess():
  1. Check localStorage for cached fileId
  2. findOrCreateFile():
     a. If fileId cached → verify exists (GET /files/{id})
     b. If not → search by name (GET /files?q=name='todo-data.json')
     c. If not found → create via multipart upload
  3. readFromDrive() → data = response JSON
  4. Show app, render()
```

- `fileId` cached in `localStorage['todo_drive_file_id']`
- 404 on read/write → clear cached fileId, re-run `findOrCreateFile()`, retry

## PWA shell

- `sw.js`: no caching; `skipWaiting()` + `clients.claim()`; fetch handler is a no-op (passthrough)
- `manifest.json`: `display: standalone`, SVG icon, dark theme color
- Registered with `updateViaCache: 'none'` to bypass HTTP cache on SW checks

## Auto-update mechanism

```
On page load:
  if URL has ?code= or ?error= → skip (OAuth redirect in progress)
  else → fetch('version.txt?_=' + Date.now())   // always bypasses cache
    → compare response with APP_VERSION
    → if mismatch: redirect to self with cache-busting query param
```

- Solves GitHub Pages HTTP cache (no custom cache-control headers available)
- Mobile PWAs serve stale HTML from HTTP cache; version.txt fetch is immune (cache-busted)
- Redirect with `?_=timestamp` forces browser to fetch fresh HTML
- Skipped when returning from OAuth redirect to prevent losing the authorization code
