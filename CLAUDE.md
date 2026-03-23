# Todo PWA

Single-file PWA with Google Drive sync. All data lives on Drive; the HTML is served from GitHub Pages.

## Build & Deploy

No build tools. Push to `main` and GitHub Pages deploys automatically.

```
git add -A && git commit -m "message" && git push
```

## Version Bumping

Every code change to `todo-prototype.html` MUST update THREE version locations:

1. `APP_VERSION` constant in the JS (e.g., `const APP_VERSION = '1.2.3';`)
2. `<div class="version-label">` in the HTML (e.g., `v1.2.3`)
3. `version.txt` file (just the version number, e.g., `1.2.3`)
4. Add a `CHANGELOG` array entry at the top

All four must match. The app auto-refreshes on mobile by comparing `APP_VERSION` against `version.txt`. Use semver:

- **Patch** (1.0.x): bug fixes, style tweaks, copy changes
- **Minor** (1.x.0): new features, new UI elements, behavior changes
- **Major** (x.0.0): breaking data model changes, architectural rewrites

## Key Architecture

- **No local cache as source of truth.** Drive JSON is the sole source of truth.
- **Optimistic UI.** Mutations apply locally and render immediately, then sync to Drive in the background.
- **Single mutation queue.** All Drive writes are serialized via `mutationQueue` to prevent races.
- **Service worker does no caching.** Exists only for PWA installability. All requests go to network.
- **Auto-update via version.txt.** On load, the app fetches `version.txt` (cache-busted). If it doesn't match `APP_VERSION`, it reloads with a cache-busting URL.
