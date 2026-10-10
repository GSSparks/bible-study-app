import { useEffect, useRef, useState } from 'react';
import { BookOpen, ScrollText, BookA, GitBranch, Compass, FileText, Search } from 'lucide-react';
import SearchBar from './SearchBar.jsx';
import WorkspaceLayout from './WorkspaceLayout.jsx';
import { api } from '../api/client.js';
import { useWorkspaceLayout } from '../hooks/useWorkspaceLayout.js';
import { simplifyForTopicalSearch } from '../utils/searchStem.js';

const WINDOW_TOGGLES = [
  { type: 'bible',        Icon: BookOpen,    title: 'Bible' },
  { type: 'commentary',   Icon: ScrollText,  title: 'Commentary' },
  { type: 'dictionary',   Icon: BookA,       title: 'Dictionary' },
  { type: 'crossrefs',    Icon: GitBranch,   title: 'Cross-References' },
  { type: 'passageguide', Icon: Compass,     title: 'Passage Guide' },
  { type: 'document',     Icon: FileText,    title: 'Documents' },
  { type: 'search',       Icon: Search,      title: 'Search Results' },
];

export default function CellView({
  auth,
  onNavigateToLibrary,
  pendingBibleOpen,
  onBibleOpenConsumed,
  defaultBibleModule,
  pendingAiOverview,
  onAiOverviewConsumed,
  pendingAiPhraseStudy,
  onAiPhraseStudyConsumed,
  pendingAiDocument,
  onAiDocumentConsumed,
}) {
  const cellInit = useRef(null);
  if (cellInit.current === null) {
    const ref = (() => { try { return localStorage.getItem('cell-reference') || 'John 3:16'; } catch { return 'John 3:16'; } })();
    const history = (() => { try { const h = JSON.parse(localStorage.getItem('cell-nav-history') || 'null'); return h?.entries?.length ? h : null; } catch { return null; } })();
    cellInit.current = {
      reference: ref,
      navHistory: history ?? { entries: [ref], index: 0 },
    };
  }

  const [focusedReference, setFocusedReference] = useState(cellInit.current.reference);
  const [navHistory, setNavHistory] = useState(cellInit.current.navHistory);
  const [strongsDrawer, setStrongsDrawer] = useState(null);
  const [verseDrawer, setVerseDrawer] = useState(null);
  const [pendingDictKey, setPendingDictKey] = useState(null);
  const [pendingDictFilter, setPendingDictFilter] = useState(null);
  const [pendingDictTabId, setPendingDictTabId] = useState(null);
  const [pendingAiRequest, setPendingAiRequest] = useState(null);
  const [pendingSearch, setPendingSearch] = useState(null);
  const [commentaryRefreshNonce, setCommentaryRefreshNonce] = useState(0);
  const [dictionaryRefreshNonce, setDictionaryRefreshNonce] = useState(0);

  const layout = useWorkspaceLayout();

  // Auto-set default bible module into empty bible tabs on first load
  useEffect(() => {
    if (auth.loading || auth.setupRequired) return;
    api.listInstalledModules('BIBLE').then((mods) => {
      if (mods.length === 0) return;
      const preferred = mods.find((m) => m.name === defaultBibleModule) || mods[0];
      layout.columns.forEach((col) => {
        col.rows.forEach((row) => {
          if (row.type === 'bible') {
            row.tabs.forEach((tab) => {
              if (!tab.module) {
                layout.swapTabModule(col.id, row.id, tab.id, preferred.name, preferred.description || preferred.name);
              }
            });
          }
        });
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.setupRequired]);

  // Handle pendingBibleOpen: navigate and open a new tab in the first bible pane
  useEffect(() => {
    if (!pendingBibleOpen) return;
    navigateFocus(pendingBibleOpen.reference);
    const firstBibleCol = layout.columns.find((c) => c.rows.some((r) => r.type === 'bible'));
    const firstBibleRow = firstBibleCol?.rows.find((r) => r.type === 'bible');
    if (firstBibleCol && firstBibleRow && pendingBibleOpen.module) {
      layout.addTab(firstBibleCol.id, firstBibleRow.id, pendingBibleOpen.module, pendingBibleOpen.module);
    }
    onBibleOpenConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBibleOpen?.nonce]);

  // Persist navigation state
  useEffect(() => {
    try {
      localStorage.setItem('cell-reference', focusedReference);
      localStorage.setItem('cell-nav-history', JSON.stringify(navHistory));
    } catch {}
  }, [focusedReference, navHistory]);

  // Find or create a Passage Guide pane, then set the pending request
  function routeToAiChat(request) {
    const hasGuide = layout.columns.some((c) => c.rows.some((r) => r.type === 'passageguide'));
    if (!hasGuide) {
      const lastCol = layout.columns[layout.columns.length - 1];
      const lastRow = lastCol.rows[lastCol.rows.length - 1];
      layout.splitPane(lastCol.id, lastRow.id, 'passageguide');
    }
    setPendingAiRequest({ ...request, nonce: Date.now() });
  }

  // External AI requests from AppShell (Scriptoriums, Library)
  useEffect(() => {
    if (!pendingAiOverview) return;
    routeToAiChat({ type: 'overview', module: pendingAiOverview.module, reference: pendingAiOverview.reference });
    onAiOverviewConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAiOverview?.nonce]);

  useEffect(() => {
    if (!pendingAiPhraseStudy) return;
    routeToAiChat({ type: 'phraseStudy', phrase: pendingAiPhraseStudy.phrase, module: pendingAiPhraseStudy.module, strongsSequence: pendingAiPhraseStudy.strongsSequence });
    onAiPhraseStudyConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAiPhraseStudy?.nonce]);

  useEffect(() => {
    if (!pendingAiDocument) return;
    routeToAiChat({ type: 'document', documentId: pendingAiDocument.id });
    onAiDocumentConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAiDocument?.nonce]);

  function navigateFocus(reference) {
    if (reference === focusedReference) return;
    setFocusedReference(reference);
    // Sync primary Bible pane's active tab so search bar and deep links keep it in step
    for (const col of layout.columns) {
      for (const row of col.rows) {
        if (row.type === 'bible' && row.activeTabId) {
          layout.setBibleTabReference(col.id, row.id, row.activeTabId, reference);
          break;
        }
      }
    }
    try { localStorage.setItem('cell-last-reference', reference); } catch {}
    setNavHistory((prev) => {
      const truncated = prev.entries.slice(0, prev.index + 1);
      return { entries: [...truncated, reference], index: truncated.length };
    });
  }

  function goBack() {
    if (navHistory.index <= 0) return;
    const newIndex = navHistory.index - 1;
    const ref = navHistory.entries[newIndex];
    setFocusedReference(ref);
    setNavHistory({ ...navHistory, index: newIndex });
    for (const col of layout.columns) {
      for (const row of col.rows) {
        if (row.type === 'bible' && row.activeTabId) { layout.setBibleTabReference(col.id, row.id, row.activeTabId, ref); break; }
      }
    }
  }

  function goForward() {
    if (navHistory.index >= navHistory.entries.length - 1) return;
    const newIndex = navHistory.index + 1;
    const ref = navHistory.entries[newIndex];
    setFocusedReference(ref);
    setNavHistory({ ...navHistory, index: newIndex });
    for (const col of layout.columns) {
      for (const row of col.rows) {
        if (row.type === 'bible' && row.activeTabId) { layout.setBibleTabReference(col.id, row.id, row.activeTabId, ref); break; }
      }
    }
  }

  function handleAskAboutPassage(module, reference) {
    routeToAiChat({ type: 'overview', module, reference });
  }

  function handlePhraseStudy(phrase, module, strongsSequence) {
    routeToAiChat({ type: 'phraseStudy', phrase, module, strongsSequence });
  }

  function handleAskAiAboutDocument(docId) {
    routeToAiChat({ type: 'document', documentId: docId });
  }

  function openVerseTab(module, osisRef) {
    setVerseDrawer(null);
    const firstBibleCol = layout.columns.find((c) => c.rows.some((r) => r.type === 'bible'));
    const firstBibleRow = firstBibleCol?.rows.find((r) => r.type === 'bible');
    if (firstBibleCol && firstBibleRow) {
      const existingTab = firstBibleRow.tabs.find((t) => t.module === module);
      if (existingTab) {
        layout.setActiveTab(firstBibleCol.id, firstBibleRow.id, existingTab.id);
        layout.setBibleTabReference(firstBibleCol.id, firstBibleRow.id, existingTab.id, osisRef);
      } else {
        // navigateFocus sets focusedReference — new tab falls back to it until navigated
        navigateFocus(osisRef);
        layout.addTab(firstBibleCol.id, firstBibleRow.id, module, module);
        return;
      }
    }
    navigateFocus(osisRef);
  }

  function openStrongsInDictionary(strongsKey) {
    const lang = strongsKey.startsWith('H') ? 'hebrew' : 'greek';
    const dictKey = strongsKey.replace(/^[GH]/i, '').padStart(5, '0');
    api.listInstalledModules('DICT').then((mods) => {
      const candidates = mods.filter((m) => !/topical|nave/i.test(`${m.name} ${m.description || ''}`));
      const match =
        candidates.find((m) => new RegExp(`strongs?${lang}`, 'i').test(m.name)) ||
        candidates.find((m) => (m.description || m.name).toLowerCase().includes(lang)) ||
        candidates.find((m) => /strong/i.test(m.description || m.name));
      if (!match) return;

      // Find or create a dictionary pane
      let dictCol = layout.columns.find((c) => c.rows.some((r) => r.type === 'dictionary'));
      let dictRow = dictCol?.rows.find((r) => r.type === 'dictionary');

      let targetColId, targetRowId;
      if (!dictCol || !dictRow) {
        dictCol = layout.columns[layout.columns.length - 1];
        const newPaneId = layout.splitPane(dictCol.id, dictCol.rows[dictCol.rows.length - 1].id, 'dictionary');
        targetColId = dictCol.id;
        targetRowId = newPaneId;
      } else {
        targetColId = dictCol.id;
        targetRowId = dictRow.id;
      }

      const existingTab = dictRow?.tabs.find((t) => t.module === match.name);
      let targetTabId;
      if (existingTab) {
        layout.setActiveTab(targetColId, targetRowId, existingTab.id);
        targetTabId = existingTab.id;
      } else {
        targetTabId = layout.addTab(targetColId, targetRowId, match.name, match.description || match.name);
      }
      setPendingDictKey(dictKey);
      setPendingDictFilter(null);
      setPendingDictTabId(targetTabId);
    });
  }

  function openTopicalSearch(word) {
    if (!word) return;
    const searchTerm = simplifyForTopicalSearch(word);
    api.listInstalledModules('DICT').then((mods) => {
      const match = mods.find((m) => /topical|nave/i.test(`${m.name} ${m.description || ''}`));
      if (!match) return;

      let dictCol = layout.columns.find((c) => c.rows.some((r) => r.type === 'dictionary'));
      let dictRow = dictCol?.rows.find((r) => r.type === 'dictionary');

      let targetColId, targetRowId;
      if (!dictCol || !dictRow) {
        dictCol = layout.columns[layout.columns.length - 1];
        const newPaneId = layout.splitPane(dictCol.id, dictCol.rows[dictCol.rows.length - 1].id, 'dictionary');
        targetColId = dictCol.id;
        targetRowId = newPaneId;
      } else {
        targetColId = dictCol.id;
        targetRowId = dictRow.id;
      }

      const existingTab = dictRow?.tabs.find((t) => t.module === match.name);
      let targetTabId;
      if (existingTab) {
        layout.setActiveTab(targetColId, targetRowId, existingTab.id);
        targetTabId = existingTab.id;
      } else {
        targetTabId = layout.addTab(targetColId, targetRowId, match.name, match.description || match.name);
      }
      setPendingDictKey(null);
      setPendingDictFilter(searchTerm);
      setPendingDictTabId(targetTabId);
    });
  }

  function routeToSearch(query) {
    const hasSearch = layout.columns.some((c) => c.rows.some((r) => r.type === 'search'));
    if (!hasSearch) {
      const lastCol = layout.columns[layout.columns.length - 1];
      const lastRow = lastCol.rows[lastCol.rows.length - 1];
      layout.splitPane(lastCol.id, lastRow.id, 'search');
    }
    setPendingSearch({ query, module: firstBibleTab?.module || '', nonce: Date.now() });
  }

  function togglePaneType(type) {
    const existing = [];
    for (const col of layout.columns) {
      for (const row of col.rows) {
        if (row.type === type) existing.push({ colId: col.id, rowId: row.id });
      }
    }
    if (existing.length > 0) {
      existing.forEach(({ colId, rowId }) => layout.removePane(colId, rowId));
    } else {
      const lastCol = layout.columns[layout.columns.length - 1];
      const lastRow = lastCol.rows[lastCol.rows.length - 1];
      layout.splitPane(lastCol.id, lastRow.id, type);
    }
  }

  // Active Bible module comes from the first bible tab found across all columns
  const firstBibleTab = (() => {
    for (const col of layout.columns) {
      for (const row of col.rows) {
        if (row.type === 'bible' && row.tabs.length > 0) return row.tabs[0];
      }
    }
    return null;
  })();

  const shared = {
    focusedReference,
    onNavigate: navigateFocus,
    defaultBibleModule,
    auth,
    onAnnotate: onNavigateToLibrary,
    onAskAboutPassage: handleAskAboutPassage,
    onPhraseStudy: handlePhraseStudy,
    openStrongsInDictionary,
    openTopicalSearch,
    pendingDictKey,
    pendingDictFilter,
    pendingDictTabId,
    pendingAiRequest,
    pendingSearch,
    onAskAiAboutDocument: handleAskAiAboutDocument,
    strongsDrawer,
    setStrongsDrawer,
    verseDrawer,
    setVerseDrawer,
    openVerseTab,
    commentaryRefreshNonce,
    dictionaryRefreshNonce,
    onPersonalCommentarySaved: () => setCommentaryRefreshNonce((n) => n + 1),
    onPersonalDictionarySaved: () => setDictionaryRefreshNonce((n) => n + 1),
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Navigation bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-rule px-4 py-2">
        {/* History back/forward */}
        <div className="flex shrink-0 gap-1">
          <button
            onClick={goBack}
            disabled={navHistory.index <= 0}
            className="rounded border border-rule px-2 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-muted"
            title="Back"
          >
            ‹
          </button>
          <button
            onClick={goForward}
            disabled={navHistory.index >= navHistory.entries.length - 1}
            className="rounded border border-rule px-2 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-muted"
            title="Forward"
          >
            ›
          </button>
        </div>

        {/* Search */}
        <div className="min-w-0 flex-1">
          <SearchBar activeModule={firstBibleTab?.module} onJump={navigateFocus} onSearch={routeToSearch} />
        </div>

        {/* Window toggles */}
        <div className="flex shrink-0 items-center gap-0.5">
          {WINDOW_TOGGLES.map(({ type, Icon, title }) => {
            const isActive = layout.columns.some((c) => c.rows.some((r) => r.type === type));
            return (
              <button
                key={type}
                onClick={() => togglePaneType(type)}
                title={title}
                className={`rounded p-1.5 transition-colors ${
                  isActive
                    ? 'text-brass'
                    : 'text-muted hover:text-parchment'
                }`}
              >
                <Icon size={16} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <WorkspaceLayout
          {...layout}
          shared={shared}
        />
      </div>
    </div>
  );
}
