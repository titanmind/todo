# Interactions

## Scope
- In: touch/pointer gestures, long-press/drag continuum, overlay management, navigation
- Out: Drive sync mechanics (see [architecture.md](architecture.md))

## Vocabulary
- **Long press**: pointer held 400ms+ without movement
- **Context menu**: bottom-sheet overlay showing item actions
- **Backdrop**: full-screen semi-transparent overlay behind modals/menus
- **Drag placeholder**: empty div occupying the dragged item's original space in flow

## Tap

**On item**: toggle `status` (todo ↔ done) via `mutate()`
**On category**: push category ID onto `navStack`, re-render at new depth

## Long press → context menu / drag continuum

```
pointerdown
  ├─ Start 400ms timer
  ├─ Track pressStartPos
  │
  ├─ Movement > 8px before 400ms → cancel timer (just a scroll)
  │
  └─ 400ms elapsed (longPressTriggered):
      ├─ Vibrate 30ms
      ├─ Show context menu WITHOUT backdrop
      │   (backdrop would cause pointercancel on mobile)
      │
      ├─ pointerup without movement:
      │   └─ Add backdrop; menu stays open for interaction
      │
      └─ pointermove with movement:
          ├─ Dismiss context menu (just remove .active class)
          └─ startDrag()
```

**Key mobile constraint**: backdrop with `pointer-events: all` causes mobile Chrome to fire `pointercancel`, killing the entire touch event chain. Backdrop is deferred until pointer release.

## Drag-to-reorder

### startDrag
1. Capture dragged row's `getBoundingClientRect()`
2. Insert placeholder div at row's position
3. Set row to `position: fixed` (`.dragging` class)
4. Freeze scroll container (`overflowY: hidden`)
5. **Pre-compute midpoints** of all other rows (one-time `getBoundingClientRect` per row)
6. Store `origIdx`: dragged item's index in the full row list

### updateDrag (on every pointermove)
1. Move dragged row to follow pointer (`style.top = clientY - offsetY`)
2. Compute `insertIdx` from pointer Y vs stored midpoints
3. Only update transforms when `insertIdx` changes (skip if same as `lastInsertIdx`)
4. Shift logic relative to `origIdx`:
   - `insertIdx < origIdx`: rows `[insertIdx, origIdx)` shift **down** (+rowHeight)
   - `insertIdx > origIdx`: rows `[origIdx, insertIdx)` shift **up** (-rowHeight)
   - `insertIdx == origIdx`: no shifts
5. Category drop-target detection: highlight if pointer within category bounds

### endDrag
1. Clean up: remove `.dragging`, remove placeholder, restore scroll
2. If dropped on category → `removeFromTree()` + push to category's children
3. Otherwise → reorder within current level; renumber `order` fields
4. `mutate()` writes new state to Drive

### Invariants
- No `getBoundingClientRect()` calls during drag (stored midpoints only)
- Transitions set once at drag start; not re-applied per frame
- Scroll frozen during drag to prevent touch interference

## Overlay management

```ts
let activeOverlay: string | null;  // 'contextMenu' | 'modal' | 'settingsPanel' | 'changelogPanel'

showOverlay(id):  add .active to backdrop + overlay element
closeOverlay():   if modal has unsaved data → show confirm; else forceCloseOverlay()
forceCloseOverlay(): remove .active from backdrop + overlay; clear contextItem, editingItem
```

## Navigation

- `navStack: string[]` — array of category UUIDs from root to current depth
- `getCurrentItems()` traverses `data.items` following `navStack`; trims stale entries if category deleted
- Breadcrumbs built from `getPathNames()`; clicking a crumb truncates `navStack`
- Search clears `navStack` context; clicking a search result sets `navStack` to that item's path
