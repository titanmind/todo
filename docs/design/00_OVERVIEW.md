# 00_OVERVIEW

## System purpose
- Single-file PWA for personal task management; hierarchical todos synced to Google Drive as sole data store.

## Surfaces
- Runtime: standalone PWA (HTML/CSS/JS), GitHub Pages static hosting
- Data: single JSON file on Google Drive (`todo-data.json`)
- Auth: OAuth2 authorization code flow with PKCE; refresh tokens for persistent login (`drive.file` scope)
- Sync: event-driven Drive reads/writes (no polling, no WebSocket)

## Doc map
- Architecture: [architecture.md](architecture.md)
- Data model: [data_model.md](data_model.md)
- Interfaces: [interfaces.md](interfaces.md)
- Interactions: [interactions.md](interactions.md)
- Ops & deployment: [ops.md](ops.md)

## Global invariants
- Drive JSON is sole source of truth; no local cache acts as authority
- All mutations serialize through `mutationQueue` Promise chain
- Optimistic UI: render locally first, sync to Drive in background
- Service worker caches nothing; exists only for PWA installability
- Version must match across `APP_VERSION`, `version-label` div, `version.txt`, and `CHANGELOG` array

## Key trade-offs
- No offline support ⇒ Drive requires network; simplifies consistency at cost of offline usability
- No polling/real-time sync ⇒ reduces API quota usage; stale state possible until focus/refresh
- Last-write-wins on concurrent edits ⇒ simple; acceptable for single-user app
- No build tools ⇒ single HTML file; no hashed filenames; requires version.txt auto-update mechanism for cache busting
