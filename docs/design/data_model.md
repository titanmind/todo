# Data Model

## Scope
- In: Drive JSON schema, item/category structure, archive behavior, derived state
- Out: Drive API mechanics (see [interfaces.md](interfaces.md))

## Vocabulary
- **Item**: leaf node; has `status` field (`todo` | `done`)
- **Category**: container node; no `status` field; visual state derived from subtree
- **archivedFrom**: UUID of parent category at time of archival; `null` if archived from root

## Root schema

```ts
type DriveData = {
  version: 1;
  lastModified: string;          // ISO-8601, updated on every write
  items: (Item | Category)[];    // top-level tree
  archive: ArchivedEntry[];      // flat list
}
```

## Item / Category

```ts
type Item = {
  id: string;                    // crypto.randomUUID()
  type: 'item';
  name: string;
  description: string;           // may be empty string
  status: 'todo' | 'done';
  order: number;                 // sort key within parent level
  children: [];                  // always empty for items
}

type Category = {
  id: string;
  type: 'category';
  name: string;
  description: string;
  order: number;
  children: (Item | Category)[];  // arbitrary nesting depth
  // no `status` field
}
```

## Archive entry

```ts
type ArchivedEntry = (Item | Category) & {
  archivedFrom: string | null;   // parent UUID, or null if from root
}
```

- On archive: `archivedFrom` set, item removed from tree, pushed to `data.archive`
- On restore: item returned to original parent if still exists; fallback to root. `archivedFrom` deleted.
- Bulk "archive all completed": walks entire tree; sets `archivedFrom` per item's parent

## Invariants
- `status` exists only on `type: 'item'`; never on categories
- `id` is globally unique (UUID v4)
- `order` is numeric; determines position within a single level
- Category done state is derived: `isAllDone(cat)` ⇒ every item in subtree has `status: 'done'`; empty categories → not done

## Constraints + trade-offs
- Flat archive ⇒ simpler restore logic; loses original subtree structure for archived categories
- No schema migration system ⇒ `version: 1` reserved for future use but no migration pipeline exists
- `order` values may have gaps or negative numbers after reorder/toggle operations ⇒ only relative ordering matters
