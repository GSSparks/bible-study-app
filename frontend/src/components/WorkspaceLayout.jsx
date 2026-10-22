import { Fragment, useEffect, useRef, useState } from 'react';
import { useHorizontalScroll } from '../hooks/useHorizontalScroll.js';
import { BookOpen, ScrollText, BookA, GitBranch, Compass, FileText, Search, Link, MapPin } from 'lucide-react';
import PassageMapsModal from './PassageMapsModal.jsx';

const PANE_ICONS = {
  bible: BookOpen, commentary: ScrollText, dictionary: BookA,
  crossrefs: GitBranch, passageguide: Compass, document: FileText,
  search: Search, links: Link,
};
const PANE_LABELS = {
  bible: 'Bible', commentary: 'Commentary', dictionary: 'Dictionary',
  crossrefs: 'Cross-refs', passageguide: 'Guide', document: 'Docs',
  search: 'Search', links: 'Links',
};
// Fixed order for the mobile tab strip — always shows all pane types so the
// strip doubles as the open/close control (replacing the desktop window toggles).
const MOBILE_TAB_TYPES = ['bible', 'commentary', 'dictionary', 'crossrefs', 'passageguide', 'document', 'search', 'links'];
import { api } from '../api/client.js';
import { PANE_TYPES } from '../hooks/useWorkspaceLayout.js';
import { abbreviateTitle } from '../utils/abbreviateTitle.js';
import ReaderPane from './ReaderPane.jsx';
import DictionaryPane from './DictionaryPane.jsx';
import CrossRefPane from './CrossRefPane.jsx';
import PassageGuidePane from './PassageGuidePane.jsx';
import SearchResultsPane from './SearchResultsPane.jsx';
import DocumentReader from './DocumentReader.jsx';
import DocumentTabStrip from './DocumentTabStrip.jsx';
import TabStrip from './TabStrip.jsx';
import StrongsDrawer from './StrongsDrawer.jsx';
import VerseDrawer from './VerseDrawer.jsx';
import RefNav from './RefNav.jsx';
import ModulePicker from './ModulePicker.jsx';
import LinksPane from './LinksPane.jsx';

// ─── Resize handles (shown when not dragging) ─────────────────────────────────

function ColResizeHandle({ onMouseDown }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 shrink-0 cursor-col-resize bg-rule hover:bg-brass active:bg-brass"
      title="Drag to resize"
    />
  );
}

function RowResizeHandle({ onMouseDown }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="h-1 shrink-0 cursor-row-resize bg-rule hover:bg-brass active:bg-brass"
      title="Drag to resize"
    />
  );
}

// ─── Drop zones (shown while a pane is being dragged) ────────────────────────

function RowDropZone({ colId, rowId, position, isActive, onDragOver, onDrop }) {
  return (
    <div
      className={`shrink-0 transition-all duration-75 ${
        isActive ? 'h-2 bg-brass/70' : 'h-0.5 bg-rule/20'
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOver({ type: 'row', colId, rowId, position }); }}
      onDrop={(e) => { e.preventDefault(); onDrop({ type: 'row', colId, rowId, position }); }}
    />
  );
}

function ColDropZone({ colId, position, isActive, onDragOver, onDrop }) {
  return (
    <div
      className={`shrink-0 flex items-stretch transition-all duration-75 ${isActive ? 'w-8' : 'w-1'}`}
      onDragOver={(e) => { e.preventDefault(); onDragOver({ type: 'col', colId, position }); }}
      onDrop={(e) => { e.preventDefault(); onDrop({ type: 'col', colId, position }); }}
    >
      <div className={`flex-1 ${isActive ? 'bg-brass/40' : 'bg-rule/20'}`} />
    </div>
  );
}

// ─── Individual pane shell ────────────────────────────────────────────────────

function PaneShell({ col, row, shared, layoutOps, primaryBiblePaneId, isDragging, onDragStart, onDragEnd, isMobile }) {
  const [interlinearMode, setInterlinearMode] = useState(false);
  const bibleTabScrollRef = useHorizontalScroll();

  const {
    focusedReference,
    onNavigate,
    defaultBibleModule,
    auth,
    onAnnotate,
    onAskAboutPassage,
    onPhraseStudy,
    openStrongsInDictionary,
    openTopicalSearch,
    pendingDictKey,
    pendingDictFilter,
    pendingDictTabId,
    onAskAiAboutDocument,
    pendingAiRequest,
    pendingSearch,
    strongsDrawer,
    setStrongsDrawer,
    verseDrawer,
    setVerseDrawer,
    openVerseTab,
    openExternalRef,
    syncFocusedReference,
    commentaryRefreshNonce,
    dictionaryRefreshNonce,
    onPersonalCommentarySaved,
    onPersonalDictionarySaved,
  } = shared;

  const { removePane, splitPane, addTab, removeTab, setActiveTab, swapTabModule,
          setBibleTabReference, addTabParallel, removeTabParallel, swapTabParallel } = layoutOps;

  const activeTab = row.tabs.find((t) => t.id === row.activeTabId) || null;

  const paneRef = row.type === 'bible'
    ? (activeTab?.reference ?? focusedReference)
    : focusedReference;

  const [hasMaps, setHasMaps] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  useEffect(() => {
    if (row.type !== 'bible' || !paneRef) { setHasMaps(false); return; }
    let cancelled = false;
    api.getMapsForReference(paneRef)
      .then((maps) => { if (!cancelled) setHasMaps(maps.length > 0); })
      .catch(() => { if (!cancelled) setHasMaps(false); });
    return () => { cancelled = true; };
  }, [paneRef, row.type]);

  function handleBibleNavigate(ref) {
    if (activeTab) setBibleTabReference(col.id, row.id, activeTab.id, ref);
    onNavigate(ref);
  }

  const tabStripKind =
    ['commentary', 'dictionary'].includes(row.type) ? row.type : undefined;
  const activeModule = activeTab?.module || '';

  const drawerTargetRowId = row.id;

  function onStrongsClick(key, event, morph, wordText, module) {
    setVerseDrawer(null);
    setStrongsDrawer({ key, morph, wordText, module, targetRowId: drawerTargetRowId });
  }

  function onVerseRefClick(osisRef) {
    setStrongsDrawer(null);
    setVerseDrawer({ osisRef, targetRowId: drawerTargetRowId });
  }

  function renderContent() {
    switch (row.type) {
      case 'bible': {
        const activeParallels = activeTab?.parallels || [];
        const allColumns = activeTab
          ? [{ id: `_p_${activeTab.id}`, module: activeTab.module, title: activeTab.title }, ...activeParallels].filter((c) => c.module)
          : [];

        return (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Tab strip — each tab is an independent position */}
            <div ref={bibleTabScrollRef} className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-rule bg-panel px-1 py-0.5">
              {row.tabs.map((tab) => {
                const isActive = tab.id === row.activeTabId;
                const tabLabel = [tab.title || tab.module, ...(tab.parallels || []).map((p) => p.title || p.module)]
                  .filter(Boolean).map((t) => abbreviateTitle(t, 18)).join(' | ') || 'Bible';
                return (
                  <div
                    key={tab.id}
                    className={`flex shrink-0 items-center rounded text-xs whitespace-nowrap ${
                      isActive ? 'bg-ink text-brass' : 'text-muted'
                    }`}
                  >
                    <button
                      onClick={() => { setActiveTab(col.id, row.id, tab.id); syncFocusedReference(tab.reference || focusedReference); }}
                      className={`px-2 py-1 ${isActive ? '' : 'hover:text-parchment'}`}
                      title={[tab.title || tab.module, ...(tab.parallels || []).map((p) => p.title || p.module)].filter(Boolean).join(' | ') || undefined}
                    >
                      {tabLabel}
                    </button>
                    {row.tabs.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTab(col.id, row.id, tab.id); }}
                        className="px-1.5 py-1 hover:text-red-400"
                        title="Close tab"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
              <ModulePicker
                kind="bible"
                excludeModules={[]}
                label="+"
                title="Open a new tab at a different position"
                onSelect={(module, title) => addTab(col.id, row.id, module, title)}
              />
            </div>

            {/* RefNav header — reference for the active tab, with add-parallel button */}
            {activeTab && (
              <div className="flex shrink-0 items-center border-b border-rule bg-panel px-3 py-1.5">
                <RefNav reference={paneRef} onNavigate={handleBibleNavigate} />
                {hasMaps && (
                  <button
                    onClick={() => setMapModalOpen(true)}
                    title="View maps for this passage"
                    className="ml-2 shrink-0 text-verdigris opacity-70 hover:opacity-100"
                  >
                    <MapPin size={13} strokeWidth={2} />
                  </button>
                )}
                <div className="flex-1" />
                <ModulePicker
                  kind="bible"
                  excludeModules={[]}
                  label="∥"
                  title="Show a parallel translation alongside this one"
                  onSelect={(module, title) => addTabParallel(col.id, row.id, activeTab.id, module, title)}
                />
              </div>
            )}

            {/* Content — shared scroll container; columns side-by-side, scroll together */}
            <div className="flex min-h-0 flex-1 overflow-y-auto bg-page">
              <div className="flex min-h-full w-full">
                {!activeTab && <EmptyPaneContent label="No Bible tab open — click + above to add one." />}
                {allColumns.map((item, i) => (
                  <div key={item.id} className="flex min-w-0 flex-1 flex-col">
                    {allColumns.length > 1 && (
                      <div className="sticky top-0 z-10 flex items-center border-b border-pageBorder bg-page px-3 py-1">
                        <ModulePicker
                          kind="bible"
                          excludeModules={[]}
                          label={abbreviateTitle(item.title || item.module || 'Bible', 18)}
                          title={item.title || item.module || 'Bible'}
                          onSelect={i === 0
                            ? (m, t) => swapTabModule(col.id, row.id, activeTab.id, m, t)
                            : (m, t) => swapTabParallel(col.id, row.id, activeTab.id, item.id, m, t)
                          }
                        />
                        {i > 0 && (
                          <button
                            onClick={() => removeTabParallel(col.id, row.id, activeTab.id, item.id)}
                            className="ml-1 rounded px-1 py-0.5 text-xs text-muted hover:text-red-400"
                            title="Remove parallel"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                    <ReaderPane
                      module={item.module}
                      reference={paneRef}
                      focusMode
                      noScroll
                      interlinearMode={interlinearMode}
                      onInterlinearToggle={() => setInterlinearMode((m) => !m)}
                      onNavigate={handleBibleNavigate}
                      onOpenInTab={(ref) => openVerseTab(item.module, ref)}
                      onStrongsClick={onStrongsClick}
                      onVerseRefClick={onVerseRefClick}
                      onAnnotate={onAnnotate}
                      onAskAboutPassage={onAskAboutPassage}
                      onPhraseStudy={onPhraseStudy}
                      onPersonalCommentarySaved={onPersonalCommentarySaved}
                    />
                  </div>
                ))}
              </div>
            </div>

            {!isMobile && strongsDrawer?.targetRowId === row.id && (
              <StrongsDrawer
                strongsKey={strongsDrawer.key}
                morph={strongsDrawer.morph}
                wordText={strongsDrawer.wordText}
                module={strongsDrawer.module}
                onClose={() => setStrongsDrawer(null)}
                onNavigateKey={(key) => setStrongsDrawer((prev) => ({ ...prev, key, morph: undefined }))}
                onOpenInDictionary={openStrongsInDictionary}
                onSearchTopical={openTopicalSearch}
              />
            )}
            {!isMobile && verseDrawer?.targetRowId === row.id && (
              <VerseDrawer
                osisRef={verseDrawer.osisRef}
                module={defaultBibleModule}
                onClose={() => setVerseDrawer(null)}
                onOpenInTab={openVerseTab}
              />
            )}
          </div>
        );
      }

      case 'commentary':
        return (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              {row.tabs.length === 0 && <EmptyPaneContent label="No commentaries open — click + above to add one." />}
              {row.tabs.map((tab) => (
                <div key={tab.id} className={tab.id === row.activeTabId ? 'h-full' : 'hidden'}>
                  <ReaderPane
                    module={tab.module}
                    reference={focusedReference}
                    showMarginalia={false}
                    onNavigate={onNavigate}
                    onStrongsClick={onStrongsClick}
                    onVerseRefClick={onVerseRefClick}
                    onAskAboutPassage={onAskAboutPassage}
                    onPhraseStudy={onPhraseStudy}
                    refreshNonce={commentaryRefreshNonce}
                  />
                </div>
              ))}
            </div>
            {!isMobile && strongsDrawer?.targetRowId === row.id && (
              <StrongsDrawer
                strongsKey={strongsDrawer.key}
                morph={strongsDrawer.morph}
                wordText={strongsDrawer.wordText}
                module={strongsDrawer.module}
                onClose={() => setStrongsDrawer(null)}
                onNavigateKey={(key) => setStrongsDrawer((prev) => ({ ...prev, key, morph: undefined }))}
                onOpenInDictionary={openStrongsInDictionary}
                onSearchTopical={openTopicalSearch}
              />
            )}
            {!isMobile && verseDrawer?.targetRowId === row.id && (
              <VerseDrawer
                osisRef={verseDrawer.osisRef}
                module={defaultBibleModule}
                onClose={() => setVerseDrawer(null)}
                onOpenInTab={openVerseTab}
              />
            )}
          </div>
        );

      case 'dictionary':
        return (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              {row.tabs.length === 0 && <EmptyPaneContent label="No dictionaries open — click + above to add one." />}
              {row.tabs.map((tab) => (
                <div key={tab.id} className={tab.id === row.activeTabId ? 'h-full' : 'hidden'}>
                  <DictionaryPane
                    module={tab.module}
                    focusedReference={focusedReference}
                    onVerseRefClick={onVerseRefClick}
                    onStrongsClick={onStrongsClick}
                    onOpenInDictionary={openStrongsInDictionary}
                    initialKey={tab.id === pendingDictTabId ? pendingDictKey : null}
                    initialFilter={tab.id === pendingDictTabId ? pendingDictFilter : null}
                    refreshNonce={dictionaryRefreshNonce}
                    isLoggedIn={Boolean(auth?.user)}
                  />
                </div>
              ))}
            </div>
            {!isMobile && strongsDrawer?.targetRowId === row.id && (
              <StrongsDrawer
                strongsKey={strongsDrawer.key}
                morph={strongsDrawer.morph}
                wordText={strongsDrawer.wordText}
                module={strongsDrawer.module}
                onClose={() => setStrongsDrawer(null)}
                onNavigateKey={(key) => setStrongsDrawer((prev) => ({ ...prev, key, morph: undefined }))}
                onOpenInDictionary={openStrongsInDictionary}
                onSearchTopical={openTopicalSearch}
              />
            )}
            {!isMobile && verseDrawer?.targetRowId === row.id && (
              <VerseDrawer
                osisRef={verseDrawer.osisRef}
                module={defaultBibleModule}
                onClose={() => setVerseDrawer(null)}
                onOpenInTab={openVerseTab}
              />
            )}
          </div>
        );

      case 'crossrefs':
        return (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              <CrossRefPane
                reference={focusedReference}
                module={defaultBibleModule}
                onVerseRefClick={onVerseRefClick}
                onNavigate={openExternalRef}
              />
            </div>
            {!isMobile && verseDrawer?.targetRowId === row.id && (
              <VerseDrawer
                osisRef={verseDrawer.osisRef}
                module={defaultBibleModule}
                onClose={() => setVerseDrawer(null)}
                onOpenInTab={openVerseTab}
              />
            )}
          </div>
        );

      case 'passageguide':
        return (
          <div className="min-h-0 flex-1 overflow-hidden">
            <PassageGuidePane
              reference={focusedReference}
              module={defaultBibleModule}
              isLoggedIn={Boolean(auth?.user)}
              pendingAiRequest={pendingAiRequest}
              onPersonalDictionarySaved={onPersonalDictionarySaved}
            />
          </div>
        );

      case 'links':
        return (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              <LinksPane
                focusedReference={focusedReference}
                defaultBibleModule={defaultBibleModule}
                onStrongsClick={onStrongsClick}
                onVerseRefClick={onVerseRefClick}
                isLoggedIn={Boolean(auth?.user)}
              />
            </div>
            {!isMobile && strongsDrawer?.targetRowId === row.id && (
              <StrongsDrawer
                strongsKey={strongsDrawer.key}
                morph={strongsDrawer.morph}
                wordText={strongsDrawer.wordText}
                module={strongsDrawer.module}
                onClose={() => setStrongsDrawer(null)}
                onNavigateKey={(key) => setStrongsDrawer((prev) => ({ ...prev, key, morph: undefined }))}
                onOpenInDictionary={openStrongsInDictionary}
                onSearchTopical={openTopicalSearch}
              />
            )}
            {!isMobile && verseDrawer?.targetRowId === row.id && (
              <VerseDrawer
                osisRef={verseDrawer.osisRef}
                module={defaultBibleModule}
                onClose={() => setVerseDrawer(null)}
                onOpenInTab={openVerseTab}
              />
            )}
          </div>
        );

      case 'search':
        return (
          <div className="min-h-0 flex-1 overflow-hidden">
            <SearchResultsPane
              pendingSearch={pendingSearch}
              onNavigate={onNavigate}
              defaultBibleModule={defaultBibleModule}
            />
          </div>
        );

      case 'document':
        return (
          <div className="min-h-0 flex-1 overflow-hidden">
            {row.tabs.length === 0 && <EmptyPaneContent label="No document open — click + above to open one." />}
            {row.tabs.map((tab) => (
              <div key={tab.id} className={tab.id === row.activeTabId ? 'h-full' : 'hidden'}>
                <DocumentReader
                  documentId={tab.module}
                  isLoggedIn={Boolean(auth?.user)}
                  isAdmin={auth?.user?.role === 'admin'}
                  onAskAI={onAskAiAboutDocument}
                  onRenamed={(updated) => swapTabModule(col.id, row.id, tab.id, updated.id, updated.title)}
                  onDeleted={() => removeTab(col.id, row.id, tab.id)}
                />
              </div>
            ))}
          </div>
        );

      default:
        return <EmptyPaneContent label={`Unknown pane type: ${row.type}`} />;
    }
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-100 ${isDragging ? 'opacity-30' : ''}`}>
      {/* Chrome row — drag handle (desktop only; useless on touch) */}
      {!isMobile && <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', `${col.id}:${row.id}`);
          // Delay so the browser captures the ghost before opacity change
          setTimeout(() => onDragStart(col.id, row.id), 0);
        }}
        onDragEnd={onDragEnd}
        className="flex shrink-0 cursor-grab items-center border-b border-rule bg-panel px-1 py-0.5 active:cursor-grabbing"
      >
        <span className="px-1 text-xs text-muted">
          {PANE_TYPES.find((p) => p.value === row.type)?.label || row.type}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => splitPane(col.id, row.id, 'crossrefs')}
            className="rounded px-1.5 py-1 text-xs text-muted hover:bg-ink hover:text-parchment"
            title="Split pane (add Cross-References below)"
          >
            ⊟
          </button>
          <button
            onClick={() => removePane(col.id, row.id)}
            className="rounded px-1.5 py-1 text-xs text-muted hover:bg-ink hover:text-red-400"
            title="Close pane"
          >
            ✕
          </button>
        </div>
      </div>}

      {/* Tab strip (only for pane types with tabs) */}
      {row.type === 'document' && (
        <DocumentTabStrip
          tabs={row.tabs}
          activeTabId={row.activeTabId}
          onSetActiveTab={(tabId) => setActiveTab(col.id, row.id, tabId)}
          onCloseTab={(tabId) => removeTab(col.id, row.id, tabId)}
          onSwapTab={(tabId, docId, title) => swapTabModule(col.id, row.id, tabId, docId, title)}
          onAddTab={(docId, title) => addTab(col.id, row.id, docId, title)}
        />
      )}
      {tabStripKind && (
        <TabStrip
          kind={tabStripKind}
          tabs={row.tabs}
          activeTabId={row.activeTabId}
          onSetActiveTab={(tabId) => setActiveTab(col.id, row.id, tabId)}
          onCloseTab={(tabId) => removeTab(col.id, row.id, tabId)}
          onSwapTabModule={(tabId, module, title) => swapTabModule(col.id, row.id, tabId, module, title)}
          onAddTab={(module, title) => addTab(col.id, row.id, module, title)}
        />
      )}

      {renderContent()}

      {mapModalOpen && (
        <PassageMapsModal
          reference={paneRef}
          onClose={() => setMapModalOpen(false)}
        />
      )}
    </div>
  );
}

function EmptyPaneContent({ label }) {
  return (
    <div className="flex h-full items-center justify-center bg-page px-6 text-center text-sm text-pageMuted">
      {label}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({ col, shared, layoutOps, containerRef, primaryBiblePaneId, dragging, over, onDragOver, onDrop, onPaneDragStart, onPaneDragEnd }) {
  const { resizeRow } = layoutOps;
  const isAnyDragging = dragging !== null;

  function startRowResize(rowId, nextRowId) {
    return (e) => {
      e.preventDefault();
      let lastY = e.clientY;
      function onMove(me) {
        const delta = me.clientY - lastY;
        lastY = me.clientY;
        const height = containerRef.current?.clientHeight || 1;
        resizeRow(col.id, rowId, nextRowId, delta, height);
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
  }

  function isRowDZ(rowId, position) {
    return over?.type === 'row' && over.colId === col.id && over.rowId === rowId && over.position === position;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {col.rows.map((row, ri) => (
        <Fragment key={row.id}>
          {/* Separator above each row: resize handle or drop zone */}
          {ri === 0 && isAnyDragging && (
            <RowDropZone
              colId={col.id} rowId={row.id} position="before"
              isActive={isRowDZ(row.id, 'before')}
              onDragOver={onDragOver} onDrop={onDrop}
            />
          )}
          {ri > 0 && !isAnyDragging && (
            <RowResizeHandle onMouseDown={startRowResize(col.rows[ri - 1].id, row.id)} />
          )}
          {ri > 0 && isAnyDragging && (
            <RowDropZone
              colId={col.id} rowId={row.id} position="before"
              isActive={isRowDZ(row.id, 'before')}
              onDragOver={onDragOver} onDrop={onDrop}
            />
          )}

          <div className="flex min-h-0 flex-col overflow-hidden" style={{ flex: row.flex }}>
            <PaneShell
              col={col}
              row={row}
              shared={shared}
              layoutOps={layoutOps}
              primaryBiblePaneId={primaryBiblePaneId}
              isDragging={dragging?.colId === col.id && dragging?.rowId === row.id}
              onDragStart={onPaneDragStart}
              onDragEnd={onPaneDragEnd}
            />
          </div>
        </Fragment>
      ))}

      {/* Drop zone below last row */}
      {isAnyDragging && col.rows.length > 0 && (
        <RowDropZone
          colId={col.id} rowId={col.rows[col.rows.length - 1].id} position="after"
          isActive={isRowDZ(col.rows[col.rows.length - 1].id, 'after')}
          onDragOver={onDragOver} onDrop={onDrop}
        />
      )}
    </div>
  );
}

// ─── WorkspaceLayout ──────────────────────────────────────────────────────────

export default function WorkspaceLayout({
  columns,
  addColumn,
  removePane,
  splitPane,
  resizeColumn,
  resizeRow,
  addTab,
  removeTab,
  setActiveTab,
  swapTabModule,
  setBibleTabReference,
  addTabParallel,
  removeTabParallel,
  swapTabParallel,
  movePane,
  shared,
}) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { colId, rowId }
  const [over, setOver] = useState(null);
  const [mobilePaneId, setMobilePaneId] = useState(null);
  const prevPaneIdsRef = useRef(null);

  // Flat ordered list of all panes for the mobile view.
  const allPanes = columns.flatMap((col) => col.rows.map((row) => ({ col, row })));
  const activeMobilePaneId = mobilePaneId ?? allPanes[0]?.row.id ?? null;

  // Auto-switch to a newly added pane on mobile; clear stale ID when a pane is removed.
  useEffect(() => {
    const currentIds = new Set(columns.flatMap((col) => col.rows.map((r) => r.id)));
    const prev = prevPaneIdsRef.current;
    if (prev !== null) {
      setMobilePaneId((cur) => {
        if (cur && !currentIds.has(cur)) return null;
        const newId = [...currentIds].find((id) => !prev.has(id));
        return newId ?? cur;
      });
    }
    prevPaneIdsRef.current = currentIds;
  }, [columns]);

  const primaryBiblePaneId = (() => {
    for (const col of columns) {
      for (const row of col.rows) {
        if (row.type === 'bible') return row.id;
      }
    }
    return null;
  })();

  const layoutOps = {
    removePane,
    splitPane,
    resizeColumn,
    resizeRow,
    addTab,
    removeTab,
    setActiveTab,
    swapTabModule,
    setBibleTabReference,
    addTabParallel,
    removeTabParallel,
    swapTabParallel,
  };

  function handlePaneDragStart(colId, rowId) {
    setDragging({ colId, rowId });
  }

  function handlePaneDragEnd() {
    setDragging(null);
    setOver(null);
  }

  function handleDragOver(target) {
    setOver((prev) => {
      if (
        prev?.type === target.type &&
        prev?.colId === target.colId &&
        prev?.rowId === target.rowId &&
        prev?.position === target.position
      ) {
        return prev;
      }
      return target;
    });
  }

  function handleDrop(target) {
    if (!dragging) return;
    const { colId, rowId } = dragging;
    setDragging(null);
    setOver(null);
    if (target.type === 'row') {
      movePane(colId, rowId, target.colId, target.rowId, target.position);
    } else {
      movePane(colId, rowId, target.colId, null, target.position);
    }
  }

  function startColResize(colId, nextColId) {
    return (e) => {
      e.preventDefault();
      let lastX = e.clientX;
      function onMove(me) {
        const delta = me.clientX - lastX;
        lastX = me.clientX;
        const width = containerRef.current?.clientWidth || 1;
        resizeColumn(colId, nextColId, delta, width);
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
  }

  function isColDZ(colId, position) {
    return over?.type === 'col' && over.colId === colId && over.position === position;
  }

  const isAnyDragging = dragging !== null;
  const firstCol = columns[0];
  const lastCol = columns[columns.length - 1];

  return (
    <div className="h-full min-h-0 overflow-hidden">

      {/* ── Mobile layout: one pane at a time with a scrollable tab strip ── */}
      {(() => {
        const biblePaneId = allPanes.find(({ row }) => row.type === 'bible')?.row.id ?? null;
        // On mobile, navigating a verse reference should also switch the visible pane
        // to Bible so the user sees the result immediately.
        const mobileShared = {
          ...shared,
          onNavigate: (ref) => {
            shared.onNavigate(ref);
            if (biblePaneId) setMobilePaneId(biblePaneId);
          },
        };
        return (
          <div className="relative flex h-full min-h-0 flex-col lg:hidden">
            {/* Pane tab bar — shows all pane types; open ones are highlighted (tap to
                switch), closed ones are dimmed (tap to open). Replaces the desktop
                window-toggle icons which are hidden on mobile. */}
            <div className="flex shrink-0 overflow-x-auto border-b border-rule bg-panel">
              {MOBILE_TAB_TYPES.map((type) => {
                const Icon = PANE_ICONS[type] ?? FileText;
                const openPane = allPanes.find(({ row }) => row.type === type);
                const isOpen = Boolean(openPane);
                const isActive = openPane?.row.id === activeMobilePaneId;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      if (isOpen) {
                        setMobilePaneId(openPane.row.id);
                      } else {
                        const lastCol = columns[columns.length - 1];
                        const lastRow = lastCol.rows[lastCol.rows.length - 1];
                        layoutOps.splitPane(lastCol.id, lastRow.id, type);
                        // mobilePaneId auto-updates via the columns useEffect
                      }
                    }}
                    className={`flex shrink-0 flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors ${
                      isActive ? 'border-b-2 border-brass text-brass'
                      : isOpen  ? 'text-parchment hover:text-brass'
                      :           'text-muted/50 hover:text-muted'
                    }`}
                    title={isOpen ? PANE_LABELS[type] : `Open ${PANE_LABELS[type]}`}
                  >
                    <Icon size={15} strokeWidth={2} />
                    <span>{PANE_LABELS[type] ?? type}</span>
                  </button>
                );
              })}
            </div>
            {/* Pane content — all mounted, CSS toggles visibility */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {allPanes.map(({ col, row }) => (
                <div key={row.id} className={`absolute inset-0 flex flex-col ${row.id === activeMobilePaneId ? '' : 'hidden'}`}>
                  <PaneShell
                    col={col} row={row} shared={mobileShared} layoutOps={layoutOps}
                    primaryBiblePaneId={primaryBiblePaneId}
                    isDragging={false} onDragStart={() => {}} onDragEnd={() => {}}
                    isMobile
                  />
                </div>
              ))}
            </div>
            {/* Strong's and verse drawers — rendered as bottom-sheet overlays on mobile
                (suppressed inside PaneShell via isMobile so they don't clip) */}
            {shared.strongsDrawer && (
              <div className="absolute bottom-0 left-0 right-0 z-50 shadow-lg">
                <StrongsDrawer
                  strongsKey={shared.strongsDrawer.key}
                  morph={shared.strongsDrawer.morph}
                  wordText={shared.strongsDrawer.wordText}
                  module={shared.strongsDrawer.module}
                  onClose={() => shared.setStrongsDrawer(null)}
                  onNavigateKey={(key) => shared.setStrongsDrawer((prev) => ({ ...prev, key, morph: undefined }))}
                  onOpenInDictionary={shared.openStrongsInDictionary}
                  onSearchTopical={shared.openTopicalSearch}
                />
              </div>
            )}
            {shared.verseDrawer && (
              <div className="absolute bottom-0 left-0 right-0 z-50 shadow-lg">
                <VerseDrawer
                  osisRef={shared.verseDrawer.osisRef}
                  module={shared.defaultBibleModule}
                  onClose={() => shared.setVerseDrawer(null)}
                  onOpenInTab={shared.openVerseTab}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Desktop layout: multi-column resizable panes ── */}
      <div ref={containerRef} className="hidden h-full min-h-0 lg:flex overflow-hidden">
      {/* Left-edge column drop zone */}
      {isAnyDragging && (
        <ColDropZone
          colId={firstCol.id} position="new-col-before"
          isActive={isColDZ(firstCol.id, 'new-col-before')}
          onDragOver={handleDragOver} onDrop={handleDrop}
        />
      )}

      {columns.map((col, ci) => (
        <Fragment key={col.id}>
          {/* Between-column separator: resize handle or drop zone */}
          {ci > 0 && !isAnyDragging && (
            <ColResizeHandle onMouseDown={startColResize(columns[ci - 1].id, col.id)} />
          )}
          {ci > 0 && isAnyDragging && (
            <ColDropZone
              colId={col.id} position="new-col-before"
              isActive={isColDZ(col.id, 'new-col-before')}
              onDragOver={handleDragOver} onDrop={handleDrop}
            />
          )}

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ flex: col.flex }}>
            <Column
              col={col}
              shared={shared}
              layoutOps={layoutOps}
              containerRef={containerRef}
              primaryBiblePaneId={primaryBiblePaneId}
              dragging={dragging}
              over={over}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPaneDragStart={handlePaneDragStart}
              onPaneDragEnd={handlePaneDragEnd}
            />
          </div>
        </Fragment>
      ))}

      {/* Right-edge column drop zone */}
      {isAnyDragging && (
        <ColDropZone
          colId={lastCol.id} position="new-col-after"
          isActive={isColDZ(lastCol.id, 'new-col-after')}
          onDragOver={handleDragOver} onDrop={handleDrop}
        />
      )}

      {/* Add column buttons — hidden while dragging to avoid accidental clicks */}
      {!isAnyDragging && (
        <div className="flex shrink-0 self-stretch flex-col border-l border-rule divide-y divide-rule">
          <button
            onClick={() => addColumn('commentary')}
            className="flex flex-1 items-center bg-panel/50 px-1.5 text-sm text-muted hover:bg-panel hover:text-parchment"
            title="Add Commentary column"
          >
            +
          </button>
          <button
            onClick={() => addColumn('links')}
            className="flex flex-1 items-center bg-panel/50 px-1.5 text-[11px] text-muted hover:bg-panel hover:text-parchment"
            title="Add Resource Links panel"
          >
            ≡
          </button>
        </div>
      )}
      </div>{/* end desktop layout */}

    </div>
  );
}
