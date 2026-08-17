import ReaderPane from './ReaderPane.jsx';
import DictionaryPane from './DictionaryPane.jsx';
import TabStrip from './TabStrip.jsx';
import { useResizableWidth } from '../hooks/useResizableWidth.js';
import { useResizableHeight } from '../hooks/useResizableHeight.js';

/** `bible`, `commentary`, `dictionary` are each a `useTabbedWindow()`
 * instance. Everything reads/writes the one shared `focusedReference`
 * rather than keeping its own — that's the actual point of this layout
 * over the old generic window system: the Bible pane is the anchor, and
 * commentary/dictionary panels just follow it automatically instead of
 * needing an explicit link/sync mechanism.
 *
 * Every open tab's pane stays mounted, with CSS toggling which one is
 * visible — the same pattern already used for the Notes/Library/
 * Assistant dock. A version that instead rendered one shared component
 * instance and just swapped its `module` prop on tab switch looked fine
 * at first but meant every tab was silently sharing one component's
 * state: switching tabs never actually preserved anything (selected
 * dictionary key, filter text, scroll position), it just looked like it
 * did until you switched away and back.
 */
export default function MainLayout({
  bible,
  commentary,
  dictionary,
  focusedReference,
  pendingDictKey,
  pendingDictFilter,
  pendingDictTabId,
  onNavigateFocus,
  onStrongsClick,
  onVerseRefClick,
  onOpenInDictionary,
  onAnnotate,
  onAskAboutPassage,
}) {
  const { width: commentaryWidth, onDragStart: onCommentaryDragStart } = useResizableWidth({
    key: 'scriptorium-commentary-width',
    defaultWidth: 420,
    min: 280,
    max: 900,
    side: 'left',
  });
  const { height: dictionaryHeight, onDragStart: onDictionaryDragStart } = useResizableHeight({
    key: 'scriptorium-dictionary-height',
    defaultHeight: 280,
    min: 120,
    max: 700,
    side: 'top',
  });

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden p-2">
      {/* Left column: Bible on top (the anchor), Dictionary/help books
          underneath — both full width of this column. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-rule">
          <TabStrip
            kind="bible"
            tabs={bible.tabs}
            activeTabId={bible.activeTabId}
            onSetActiveTab={bible.setActiveTabId}
            onCloseTab={bible.closeTab}
            onSwapTabModule={bible.swapTabModule}
            onAddTab={bible.addTab}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            {bible.tabs.map((tab) => (
              <div key={tab.id} className={tab.id === bible.activeTabId ? 'h-full' : 'hidden'}>
                <ReaderPane
                  module={tab.module}
                  reference={focusedReference}
                  focusMode
                  onNavigate={onNavigateFocus}
                  onStrongsClick={onStrongsClick}
                  onVerseRefClick={onVerseRefClick}
                  onAnnotate={onAnnotate}
                  onAskAboutPassage={onAskAboutPassage}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          onMouseDown={onDictionaryDragStart}
          className="h-1 shrink-0 cursor-row-resize bg-rule hover:bg-brass active:bg-brass"
          title="Drag to resize"
        />

        <div
          className="flex shrink-0 flex-col overflow-hidden rounded-md border border-rule"
          style={{ height: dictionaryHeight }}
        >
          <TabStrip
            kind="dictionary"
            tabs={dictionary.tabs}
            activeTabId={dictionary.activeTabId}
            onSetActiveTab={dictionary.setActiveTabId}
            onCloseTab={dictionary.closeTab}
            onSwapTabModule={dictionary.swapTabModule}
            onAddTab={dictionary.addTab}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            {dictionary.tabs.length === 0 ? (
              <div className="flex h-full items-center justify-center bg-page px-4 text-center text-sm text-pageMuted">
                No dictionaries or help books open — click + above to add one (Treasury of Scripture
                Knowledge, Strong's dictionaries, etc.).
              </div>
            ) : (
              dictionary.tabs.map((tab) => (
                <div key={tab.id} className={tab.id === dictionary.activeTabId ? 'h-full' : 'hidden'}>
                  <DictionaryPane
                    module={tab.module}
                    focusedReference={focusedReference}
                    onVerseRefClick={onVerseRefClick}
                    onStrongsClick={onStrongsClick}
                    onOpenInDictionary={onOpenInDictionary}
                    // Only the tab actually targeted by a pending
                    // navigation should act on it — matching by "is this
                    // tab currently active" instead was the actual bug:
                    // switching to a *different* dictionary tab later
                    // made that tab active, and it would inherit a stale
                    // pending value meant for a completely different
                    // lookup (confirmed: this is exactly how a Strong's
                    // number ended up being queried against Nave's).
                    initialKey={tab.id === pendingDictTabId ? pendingDictKey : null}
                    initialFilter={tab.id === pendingDictTabId ? pendingDictFilter : null}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div
        onMouseDown={onCommentaryDragStart}
        className="w-1 shrink-0 cursor-col-resize bg-rule hover:bg-brass active:bg-brass"
        title="Drag to resize"
      />

      <div className="flex shrink-0 flex-col overflow-hidden rounded-md border border-rule" style={{ width: commentaryWidth }}>
        <TabStrip
          kind="commentary"
          tabs={commentary.tabs}
          activeTabId={commentary.activeTabId}
          onSetActiveTab={commentary.setActiveTabId}
          onCloseTab={commentary.closeTab}
          onSwapTabModule={commentary.swapTabModule}
          onAddTab={commentary.addTab}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          {commentary.tabs.length === 0 ? (
            <div className="flex h-full items-center justify-center bg-page px-4 text-center text-sm text-pageMuted">
              No commentaries open — click + above to add one.
            </div>
          ) : (
            commentary.tabs.map((tab) => (
              <div key={tab.id} className={tab.id === commentary.activeTabId ? 'h-full' : 'hidden'}>
                <ReaderPane
                  module={tab.module}
                  reference={focusedReference}
                  onStrongsClick={onStrongsClick}
                  onVerseRefClick={onVerseRefClick}
                  onAnnotate={onAnnotate}
                  onAskAboutPassage={onAskAboutPassage}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}