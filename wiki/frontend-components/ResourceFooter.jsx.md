# frontend/src/components/ResourceFooter.jsx

## Purpose

A generic tab-bar footer component used in the Study view to attach multiple resource drawers (e.g. "Passage", "Commentary") below the lesson content. A row of tab buttons runs along the bottom; clicking a tab toggles a content drawer upward. The drawer mounts its content only while the tab is open, so individual tabs fetch their own data lazily via `useEffect` once mounted.

## Props

| Prop | Type | Description |
|---|---|---|
| `tabs` | array | `[{ id, label, content: ReactElement }]` — each tab's label and content |

## State / Key Logic

- `activeTabId` — `null` (no drawer open) or the id of the active tab. Clicking the same tab again collapses the drawer.
- `activeTab.content` is the only mounted content — inactive tabs are unmounted, so they don't fetch until selected.

## Dependencies

None beyond React.

## Notes

- Deliberately generic — "ResourceFooter" has no knowledge of what the tabs contain. The Study page passes `content={<PassageQuickView .../>}` as the resource.
- The drawer has `max-h-64 overflow-y-auto` — resource content that exceeds this height scrolls internally.
