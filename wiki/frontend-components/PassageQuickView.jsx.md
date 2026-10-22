# frontend/src/components/PassageQuickView.jsx

## Purpose

A self-contained, compact wrapper around `ReaderPane` designed for use as a footer quick-reference inside the Study page. Navigation (chapter prev/next, cross-reference clicks, Strong's word lookups) all stays local to this component and never leaves the Study page. The only things that hand off to the parent are "Ask AI Companion" and phrase study — both require the StudyAssistant dock that only exists elsewhere in the app.

## Props

| Prop | Type | Description |
|---|---|---|
| `initialModule` | string | Starting module code |
| `initialReference` | string | Starting reference |
| `resetKey` | any | Changing this value resets `module` and `reference` back to `initialModule`/`initialReference` — typically the lesson ID |
| `allowModuleSwitch` | bool | If true, renders a module `<select>` above the reader |
| `moduleType` | string | Module type for the switcher list (`'BIBLE'` or `'COMMENTARY'`) |
| `onFocusNote` | func | Callback when annotation is triggered |
| `onAskAiCompanionAbout` | func | `(module, ref) => void` — deep-link to AI companion |
| `onAskAiCompanionPhraseStudy` | func | `(phrase, module, strongsSequence) => void` — deep-link to phrase study |

## State / Key Logic

- `module` and `reference` are local state, seeded from `initialModule`/`initialReference` and updated by `resetKey` change via `useEffect`.
- `strongsPopup` — `{ key, x, y, morph, wordText, module }` — opens a local `StrongsPopup`. `onOpenInDictionary`, `onSearchTopical`, and `onWordStudy` are deliberately omitted from the popup because the dictionary tab and StudyAssistant infrastructure do not exist in the Study context; the popup hides those buttons when these handlers are absent.
- `verseDrawer` — `{ osisRef }` — opens a local `VerseDrawer` for cross-references. On "Open in tab" it navigates the local reader rather than opening a real tab.
- `modules` list is fetched only when `allowModuleSwitch` is true.
- `resetKey` is keyed off the lesson's identity, not off `initialModule`/`initialReference` values directly, because two different lessons could share the same starting module/reference, and watching the values directly would not detect that change.

## Dependencies

- `ReaderPane`
- `StrongsPopup`
- `VerseDrawer`
- `api.listInstalledModules`

## Notes

This component exists specifically to provide an identical reading experience to the main Cell pane inside the Study footer, without re-implementing ReaderPane. The deliberate omission of dictionary/AI deep-link handlers from StrongsPopup and VerseDrawer is an intentional scope boundary.
