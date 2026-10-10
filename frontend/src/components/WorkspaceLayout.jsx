import { Fragment, useRef, useState } from 'react';
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

function PaneShell({ col, row, shared, layoutOps, primaryBiblePaneId, isDragging, onDragStart, onDragEnd }) {
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
            <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-rule bg-panel px-1 py-0.5">
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
                      onClick={() => setActiveTab(col.id, row.id, tab.id)}
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
                      onNavigate={handleBibleNavigate}
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

            {strongsDrawer?.targetRowId === row.id && (
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
            {verseDrawer?.targetRowId === row.id && (
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
                    onNavigate={onNavigate}
                    onStrongsClick={onStrongsClick}
                    onVerseRefClick={onVerseRefClick}
                    onAnnotate={onAnnotate}
                    onAskAboutPassage={onAskAboutPassage}
                    onPhraseStudy={onPhraseStudy}
                    refreshNonce={commentaryRefreshNonce}
                  />
                </div>
              ))}
            </div>
            {strongsDrawer?.targetRowId === row.id && (
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
            {verseDrawer?.targetRowId === row.id && (
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
                  />
                </div>
              ))}
            </div>
            {strongsDrawer?.targetRowId === row.id && (
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
            {verseDrawer?.targetRowId === row.id && (
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
              />
            </div>
            {verseDrawer?.targetRowId === row.id && (
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
      {/* Chrome row — drag handle */}
      <div
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
      </div>

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
    <div ref={containerRef} className="flex h-full min-h-0 overflow-hidden">
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

      {/* Add column button — hidden while dragging to avoid accidental clicks */}
      {!isAnyDragging && (
        <button
          onClick={() => addColumn('commentary')}
          className="flex shrink-0 items-center self-stretch border-l border-rule bg-panel/50 px-1.5 text-sm text-muted hover:bg-panel hover:text-parchment"
          title="Add a new column"
        >
          +
        </button>
      )}
    </div>
  );
}
