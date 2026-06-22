# Ops & Deployment

## Scope
- In: version management, deployment pipeline, auto-update, theme persistence
- Out: application logic, data model

## Vocabulary
- **App shell**: the static files (HTML, manifest, SW, icon, version.txt) served from GitHub Pages
- **Auto-update**: mechanism where stale cached HTML detects newer `version.txt` and forces reload

## Deployment

```
git add -A && git commit -m "message" && git push
```

- GitHub Pages auto-deploys from `main` branch, root directory
- No build step; files served as-is
- Deployment takes ~1-2 minutes (GitHub Actions)

## Version management

Every code change to `todo-prototype.html` MUST update four locations:

| Location | Example | Purpose |
|----------|---------|---------|
| `APP_VERSION` constant | `const APP_VERSION = '1.3.2';` | Runtime comparison target |
| `version-label` div | `<div class="version-label">v1.3.2</div>` | Visible in UI (bottom-left) |
| `version.txt` file | `1.3.2` | Fetched on load for staleness check |
| `CHANGELOG` array | `{ version: '1.3.2', date: '...', msg: '...' }` | Shown in settings panel |

Semver:
- **Patch** (x.y.Z): bug fixes, style tweaks, copy changes
- **Minor** (x.Y.0): new features, UI elements, behavior changes
- **Major** (X.0.0): breaking data model changes, architectural rewrites

## Auto-update flow

```
Page load → fetch('version.txt?_=' + Date.now())
  → compare response text with APP_VERSION
  → mismatch: window.location.href = pathname + '?_=' + Date.now()
  → match: proceed normally
```

- `version.txt` fetch is cache-immune (timestamp query param)
- Redirect with `?_=timestamp` forces browser to bypass HTTP cache for HTML
- Required because GitHub Pages sets `Cache-Control: max-age=600` with no override
- Skipped when URL contains `?code=` or `?error=` (OAuth redirect in progress)

## Service worker

- `sw.js` caches nothing; passthrough to network
- Exists only for PWA installability (`Add to Home Screen`)
- Registered with `{ updateViaCache: 'none' }` to bypass HTTP cache on SW checks
- On activate: clears all old caches from previous versions

## Theme persistence

- Stored: `localStorage['todo_theme']` → `'dark'` | `'light'`
- Applied: inline `<script>` in `<head>` sets `data-theme="light"` before CSS loads (prevents flash)
- `meta[name="theme-color"]` updated on toggle: dark `#141417`, light `#f8f7f5`

## Token/file persistence

| Key | Value | Purpose |
|-----|-------|---------|
| `todo_access_token` | `{ token, expiry }` | OAuth access token + expiry timestamp |
| `todo_refresh_token` | `string` | Long-lived refresh token; survives across sessions |
| `todo_drive_file_id` | `string` | Cached Drive file ID to skip search on load |
| `todo_theme` | `dark` \| `light` | Theme preference |

## Failure modes
- GitHub Pages down → service worker has no cache fallback (by design); app unavailable
- `version.txt` fetch fails → auto-update silently skipped; stale HTML persists until next load
- Push without version bump → auto-update won't trigger; mobile users stuck on old version until manual refresh
