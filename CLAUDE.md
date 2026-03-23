# Todo PWA

Single-file PWA with Google Drive sync. All data lives on Drive; the HTML is served from GitHub Pages.

## Build & Deploy

No build tools. Push to `main` and GitHub Pages deploys automatically.

```
git add -A && git commit -m "message" && git push
```

## Version Bumping

Every code change to `todo-prototype.html` MUST increment the version number in the `<div class="version-label">` element (search for `version-label`). Use semver:

- **Patch** (1.0.x): bug fixes, style tweaks, copy changes
- **Minor** (1.x.0): new features, new UI elements, behavior changes
- **Major** (x.0.0): breaking data model changes, architectural rewrites

## Key Architecture

- **No local cache as source of truth.** Drive JSON is the sole source of truth.
- **Optimistic UI.** Mutations apply locally and render immediately, then sync to Drive in the background.
- **Single mutation queue.** All Drive writes are serialized via `mutationQueue` to prevent races.
- **Service worker is network-first.** Always fetches fresh code when online; cache is offline fallback only.
