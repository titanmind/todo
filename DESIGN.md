# DESIGN.md — Todo List PWA

## Overview

A sleek, modern HTML5 Progressive Web App for personal task management. Single codebase runs on phone (Pixel) and desktop via browser. Installable to home screen as PWA. No server component whatsoever.

---

## Architecture

### Data Layer

- All application state lives in a **single JSON file on Google Drive**.
- Accessed via **Google Drive API v3** with **OAuth2 (PKCE flow)**.
- Requires a one-time Google Cloud project setup (~15 min): create project, enable Drive API, configure OAuth consent screen, create web client credentials.
- **No local cache acts as source of truth.** Every read and write hits the Drive file directly. There is no local-first or offline-first model. The Drive JSON is the sole source of truth at all times.

### Sync Strategy

No polling. No timers. Three triggers only:

1. **On focus** — The `visibilitychange` browser event fires when the tab/PWA gains focus. On every focus event, the app reads the current JSON from Drive and re-renders.
2. **Read-before-write** — Every mutation (create, edit, delete, reorder, toggle status) reads the current JSON from Drive first, applies the change, then writes back. This eliminates conflicts.
3. **Manual refresh** — A refresh button in the global controls bar. Escape hatch for the case where the app is already in focus and the user wants to pull changes made on another device.

### API Usage

- Drive API free quota is ~20,000 requests/day per project.
- With no polling, usage is purely event-driven and will be negligibly low.
- Each user action = 1 read + 1 write = 2 API calls.

### Hosting

- Static files hosted on **GitHub Pages** (or equivalent zero-maintenance static host).
- Required for HTTPS origin so OAuth redirects work.
- No server logic. No backend. Just static file serving.

---

## Data Model

```json
{
  "version": 1,
  "lastModified": "ISO-8601 timestamp",
  "items": [
    {
      "id": "uuid",
      "type": "item | category",
      "name": "string",
      "description": "string (optional)",
      "status": "todo | done (items only, omitted for categories)",
      "order": 0,
      "children": []
    }
  ],
  "archive": [
    {
      "...same item/category fields...",
      "archivedFrom": "parent-uuid | null"
    }
  ]
}
```

### Rules

- `type` is either `"item"` or `"category"`. Assigned at creation time.
- `children` is an array of the same item/category structure. Arbitrary nesting depth is supported.
- `status` exists only on items. Categories have no `status` field in the data.
- **Category visual state is derived:** A category *appears* done (same muted/receded styling as a done item) if every item in its entire subtree is done. If any descendant item is todo, the category appears todo. Empty categories appear todo.
- `order` is a numeric sort key within a given level.
- `archive` is a flat collection of archived items/categories, removed from the main tree.
- When an item is archived, it gains an `archivedFrom` field: the UUID of its parent category, or `null` if archived from root. On restore, the item returns to its original parent if that parent still exists; otherwise it falls back to root. The `archivedFrom` field is deleted after restore.

---

## UI Layout

### Global Controls Bar (top, fixed/frozen — never scrolls away)

Two rows:

**Row 1** (left to right):

- **Breadcrumb trail** — Shows the navigation path from root to the current category. Each breadcrumb segment is tappable to navigate back to that level. Root is always the leftmost segment.
- **Settings button** — Gear icon. Opens a settings overlay (see Settings Panel below).
- **Archive button** — Opens the archive view.
- **Refresh button** — Manual sync trigger.

**Row 2:**

- **Search field** — Always-visible text input. Searches item/category names and descriptions. Results shown inline replacing the normal list view.

#### Settings Panel

Opened via the gear icon in row 1. A bottom-sheet overlay with four options:

1. **Toggle theme** — Switches between dark mode (default) and light mode.
2. **Archive all completed** — Bulk-archives every `done` item across all nesting levels. Each archived item stores its `archivedFrom` reference.
3. **Export JSON** — Downloads the current data as a dated `.json` file (e.g., `todo-backup-2025-01-15.json`).
4. **Import JSON** — Opens a file picker to restore from a previously exported backup.

### Main List Area (scrollable)

- Vertically scrollable list of items and categories at the current level.
- **Sort order:** All `todo` items/categories in their user-defined order, followed by all `done` items (and all-done categories) at the bottom. Within each category independently. A category's sort position is determined by its derived visual state — if all descendants are done, it sinks to the bottom alongside done items.
- Categories are visually distinct from items (icon, chevron, or other indicator that communicates "this opens into a sublevel").
- Tapping a category navigates into it (the breadcrumb updates, the list shows that category's children).

### Floating Action Button (bottom right, always visible)

- `+` button for creating a new item or category.
- Tapping opens the creation UI (see Interactions below).

---

## Interactions

### Tap (on an item)

- Toggles the item's status between `todo` and `done`.
- Visual change: done items change appearance (color shift, strikethrough, or similar) and animate down to the bottom of the list within their current level.

### Tap (on a category)

- Navigates into the category. Breadcrumb updates. List shows children.

### Long Press (400ms — on any item or category)

A long press **always** opens the **context menu** immediately after the 400ms threshold. What happens next depends on whether the user moves or releases:

- **Release without moving:** The context menu stays open. The user interacts with it normally.
- **Move while still holding:** The context menu dismisses and **drag-to-reorder** mode engages. This is a continuation of the same long press gesture, not a separate interaction path.

**Context menu contents:**

- **Full name and description** of the item/category (primary info, visible immediately).
- **Edit** — Opens edit UI to change name, description, or type.
- **Delete** — Removes the item/category. If category, prompts about children.
- **Archive** — Moves to the archive.
- **Move up** — Moves the item/category up one level in the hierarchy (out of its parent category into the grandparent level). Only shown when inside a category (not at root).

**Drag-to-reorder behavior** (triggered by moving while holding after context menu appears):

- The held item visually lifts (scale up, shadow, slight opacity change).
- As the item is dragged past other items, those items **animate out of the way** (smooth vertical shift up/down) to indicate the new insertion point.
- **Drag into a category:** Dragging an item over a category at the same level and releasing drops it into that category.
- Releasing the item places it at the indicated position and writes the new order to Drive.

### The + (FAB) Creation Flow

- Tapping `+` opens a **creation pane/modal** with:
  - **Type selector** — Item or Category.
  - **Name field** — Required.
  - **Description field** — Optional.
  - **Submit button.**
- The new item/category is created at the current navigational level (whatever the breadcrumb shows).
- **Dismissal:** Tapping outside the creation pane:
  - If no data has been entered: closes immediately.
  - If any data has been entered: shows confirmation prompt — *"Close without submitting changes?"*

### Context Menu / Modal Dismissal

- Tapping outside any overlay (context menu, creation pane, edit view, global settings, archive view) closes it.
- Same data-loss protection as above: if the overlay has unsaved edits, prompt before closing.

---

## Completed Items Behavior

- Toggling an item to `done` does **not** remove it from the list.
- It changes visual appearance (color/style shift) and **sinks to the bottom** of the current level's list, below all `todo` items.
- This sort is per-category — each category's submenu independently sorts its own done items to its own bottom.
- Toggling back to `todo` moves it to the **top** of the todo section. It is the most recently re-activated item and therefore likely the most immediately relevant.

---

## Archive

- Archived items/categories are removed from the main tree and placed in the archive.
- Archive is accessible via the archive button in the global controls bar.
- Archive view shows all archived items as a flat list.
- Each archived item stores an `archivedFrom` field. Tapping an archived item restores it: the item returns to its original parent if that parent still exists, otherwise falls back to root. The `archivedFrom` field is removed after restore.
- Archive is its own view, navigated to and from without affecting the main list's breadcrumb state.

---

## Search

- The search field in the global controls bar filters across **all levels** of the hierarchy.
- Searches both names and descriptions.
- Results are displayed inline, replacing the normal list view while the search field has input.
- Each result should indicate its location in the hierarchy (e.g., "Groceries > Dairy > Milk") so the user knows where it lives.
- Tapping a search result navigates to that item in its actual location (breadcrumb updates accordingly).
- Clearing the search field restores the previous list view at whatever level the user was on.

---

## Visual Design

### General Aesthetic

- Sleek, modern, minimal.
- **Dark mode** by default. **Light mode** toggled via the settings panel.
- Smooth, performant animations throughout — every state change (toggle, reorder, navigate, create, delete) should have a corresponding transition. Nothing pops in/out without animation.
- "Juicy" interactions: tactile feel on long press (subtle haptic via Vibration API on mobile), satisfying motion on drag-and-drop, bounce/spring easing on list reorder animations.

### Item Row

- Name displayed prominently.
- If a description exists: name followed by an **em dash** and the description, **truncated with ellipsis** if it overflows the row width. Single line.
- Category rows have a visual differentiator (folder icon, chevron, or similar).
- Done items: muted color, strikethrough on name, visually receded but still legible.

### Typography

- Clean sans-serif. System font stack or a single web font (Inter, SF Pro, or similar).

### Color

- High-contrast, accessible.
- Accent color for interactive elements (FAB, active breadcrumbs, toggle state).
- Distinct but subtle color coding for done vs. todo states.

### Theme

- Dark theme is the default. Light theme is toggled via the settings panel.
- Theme is applied via a `[data-theme="light"]` attribute on `<html>`. Absence of the attribute = dark mode.
- All colors are defined as CSS custom properties on `:root` (dark) and `[data-theme="light"]` (light). All UI elements reference these variables, enabling theme switching without class changes.

### Animations

- **Reorder drag:** Items shift with spring/ease-out animation (~200ms).
- **Done toggle:** Item fades/shifts to new position at list bottom (~300ms).
- **Category navigation:** Horizontal slide transition (push left to go deeper, push right to go back).
- **Context menu / creation pane:** Fade + scale-up from origin point (~150ms).
- **Dismissal:** Reverse of open animation.

---

## PWA Configuration

- `manifest.json` with app name, icons, `display: standalone`, theme color.
- Service worker for **app shell caching only** (HTML/CSS/JS assets). The service worker does NOT cache data. All data comes from Drive on every access.
- Installable on Android (and desktop) via "Add to Home Screen."

---

## Edge Cases and Decisions

| Scenario | Behavior |
|---|---|
| App opened with no network | Show last-rendered state (stale) with a clear "offline" indicator. All mutations disabled until network returns. |
| Drive file doesn't exist yet | App creates it on first launch with an empty initial structure. |
| Delete a category with children | Prompt: "Delete [name] and all its contents?" |
| Archive a category with children | Entire subtree moves to archive together. |
| Drag item onto itself | No-op. |
| Search with no results | "No items match your search." |
| Very deep nesting (5+ levels) | Breadcrumb truncates middle segments with "..." — first and last two segments always visible. Tapping "..." expands full path. |
| OAuth token expired during a write | Silently refresh token and retry. If refresh fails, prompt user to re-authenticate. |
| Concurrent edits (same user, two devices, near-simultaneous) | Read-before-write makes this effectively impossible. In the astronomically unlikely race condition, last write wins. |

---

## Tech Stack

- **HTML5 / CSS3 / Vanilla JS** (or lightweight framework — TBD at build time)
- **Google Drive API v3** (REST, called directly from client-side JS)
- **Google Identity Services** (OAuth2 PKCE, client-side)
- **GitHub Pages** (static hosting)
- No build tools required unless a framework is chosen. Can be a single HTML file.

---

## Future Considerations (not in initial build)

- Due dates / reminders
- Priority levels
- Tags / labels
- Color-coded categories
- Keyboard shortcuts (desktop)
- Drag-and-drop across category boundaries (currently handled via "Move up" in context menu)
- Collaborative sharing (multiple users on same Drive file)
- Undo history (beyond the single-action undo of a status toggle)
