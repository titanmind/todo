# Interfaces

## Scope
- In: Drive API calls, OAuth token management, `driveRequest` wrapper
- Out: UI event handlers (see [interactions.md](interactions.md))

## Vocabulary
- **driveRequest**: wrapper around `fetch` that injects auth header and handles 401 retry
- **ensureToken**: guarantees a valid access token before any API call

## Token management

```ts
// State
let accessToken: string | null;
let tokenExpiry: number;           // Date.now() + expires_in * 1000
let refreshTokenStr: string | null; // long-lived; stored in localStorage
let tokenPromise: Promise | null;  // dedup concurrent refreshes

async ensureToken(): Promise<void>
  // If token valid (expiry > 60s away): return
  // If refresh already in flight: return existing tokenPromise
  // Otherwise: call silentRefresh() → POST to token endpoint with refresh_token
  // On failure: show login screen, throw

async silentRefresh(): Promise<void>
  // POST https://oauth2.googleapis.com/token with grant_type=refresh_token
  // On success: update accessToken, tokenExpiry, persist to localStorage
  // On failure (400/401): clear all stored tokens, throw
```

## Drive API wrapper

```ts
async driveRequest(url: string, options?: RequestInit): Promise<Response>
  // 1. await ensureToken()
  // 2. fetch(url, { ...options, headers: { Authorization: Bearer ${token} } })
  // 3. If 401: invalidate token, ensureToken(), retry once
  // 4. Return Response
```

## Drive operations

### Find or create file
```
GET  /drive/v3/files?q=name='todo-data.json'+and+trashed=false&spaces=drive&fields=files(id)
POST /upload/drive/v3/files?uploadType=multipart  (if not found)
     Content-Type: multipart/related; boundary=...
     Part 1: metadata JSON { name, mimeType }
     Part 2: initial data JSON { version, lastModified, items, archive }
```

### Read
```
GET /drive/v3/files/{fileId}?alt=media
→ 200: JSON body (DriveData)
→ 404: clear fileId, findOrCreateFile(), retry
```

### Write
```
PATCH /upload/drive/v3/files/{fileId}?uploadType=media
      Content-Type: application/json
      Body: JSON.stringify(data)
→ 200: success
→ 404: clear fileId, findOrCreateFile(), retry
```

### Verify file exists
```
GET /drive/v3/files/{fileId}?fields=id
→ 200: file exists
→ 404: file deleted externally
```

## Failure modes
- 401 on any request → silent refresh via refresh token + retry once; if refresh token revoked, show login
- 404 on read/write → file deleted externally; re-create and retry
- Network error on write → re-read authoritative state from Drive; local optimistic state discarded
- Network error on read (refreshData) → silently fail; stale local state persists
