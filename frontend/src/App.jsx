import { useEffect, useState } from 'react';
import Workspace from './components/Workspace.jsx';
import SearchBar from './components/SearchBar.jsx';
import ModuleManager from './components/ModuleManager.jsx';
import StrongsPopup from './components/StrongsPopup.jsx';
import VersePopup from './components/VersePopup.jsx';
import Library from './components/Library.jsx';
import NotesSidebar from './components/NotesSidebar.jsx';
import StudyAssistant from './components/StudyAssistant.jsx';
import { api } from './api/client.js';
import { useResizableWidth } from './hooks/useResizableWidth.js';

const DOCK_TABS = ['notes', 'library', 'assistant'];
const SYNC_GROUPS = [null, 'A', 'B', 'C'];

let nextId = 1;
const uid = (prefix) => `${prefix}-${nextId++}`;

export default function App() {
  // Tabs (not windows) are the linkable unit: each tab has its own
  // reading position and sync group. A window is just a container of
  // tabs of one kind (Bible / Commentary / Dictionary) — "tile" arranges
  // windows side by side, and tabs within a window switch between
  // versions. The colored sync dot lives on each tab so, e.g., two
  // different commentary tabs in the same window can each follow a
  // different Bible tab independently, rather than the whole window
  // being forced into one link group.
  const [windows, setWindows] = useState([
    {
      id: 'win-0',
      kind: 'bible',
      tabs: [{ id: 'tab-0', module: '', title: 'Bible', reference: 'John 3:16', syncGroup: 'A' }],
      activeTabId: 'tab-0',
    },
  ]);
  const [activeWindowId, setActiveWindowId] = useState('win-0');
  const [layout, setLayout] = useState('tiled'); // 'tiled' | 'tabbed'
  const [showModuleManager, setShowModuleManager] = useState(false);
  const [dockTab, setDockTab] = useState('notes');
  const [strongsPopup, setStrongsPopup] = useState(null); // { key, x, y }
  const [versePopup, setVersePopup] = useState(null); // { osisRef, x, y }
  const [defaultBibleModule, setDefaultBibleModuleState] = useState(() => {
    try {
      return localStorage.getItem('scriptorium-default-bible') || '';
    } catch {
      return '';
    }
  });

  function setDefaultBibleModule(moduleCode) {
    setDefaultBibleModuleState(moduleCode);
    try {
      localStorage.setItem('scriptorium-default-bible', moduleCode);
    } catch {
      // storage unavailable — not worth failing over
    }
  }
  const { width: dockWidth, onDragStart: onDockDragStart } = useResizableWidth({
    key: 'scriptorium-dock-width',
    defaultWidth: 384,
    min: 280,
    max: 720,
    side: 'left',
  });

  // Fill in a Bible module on first load — the default one if set,
  // otherwise whatever's installed — so the initial window isn't just an
  // empty prompt.
  useEffect(() => {
    api
      .listInstalledModules('BIBLE')
      .then((mods) => {
        if (mods.length === 0) return;
        const preferred = mods.find((m) => m.name === defaultBibleModule) || mods[0];
        setWindows((prev) =>
          prev.map((w) =>
            w.kind === 'bible'
              ? { ...w, tabs: w.tabs.map((t) => (t.module ? t : { ...t, module: preferred.name, title: preferred.description || preferred.name })) }
              : w
          )
        );
      })
      .catch(() => {});
    // Only meant to run once on mount, using whatever the default was at
    // that point — not re-run every time the default changes afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeWindow = windows.find((w) => w.id === activeWindowId) || windows[0];
  const activeTab = activeWindow?.tabs.find((t) => t.id === activeWindow.activeTabId) || activeWindow?.tabs[0];

  // Every open Bible/commentary tab across every window, flattened —
  // this is what the study assistant gleans context from instead of
  // requiring a manual "load context" step.
  const openSources = windows
    .filter((w) => w.kind === 'bible' || w.kind === 'commentary')
    .flatMap((w) => w.tabs.map((t) => ({ module: t.module, reference: t.reference, kind: w.kind, title: t.title })));

  function openModuleInWindow({ kind, module, title }) {
    const existing = windows.find((w) => w.kind === kind);
    if (existing) {
      addTabToWindow(existing.id, module, title);
      return;
    }
    const windowId = uid('win');
    const tabId = uid('tab');
    const anyOpenTab = windows.flatMap((w) => w.tabs).find((t) => t.reference);
    const newTab = {
      id: tabId,
      module,
      title,
      reference: kind === 'dictionary' ? undefined : anyOpenTab?.reference || 'John 3:16',
      syncGroup: kind === 'dictionary' ? null : 'A',
    };
    setWindows((prev) => [...prev, { id: windowId, kind, tabs: [newTab], activeTabId: tabId }]);
    setActiveWindowId(windowId);
  }

  function addTabToWindow(windowId, module, title) {
    const tabId = uid('tab');
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== windowId) return w;
        // New tab starts at the same reference/sync group as whatever
        // was active in this window, so it opens showing the same
        // passage and "just works" the way the old window-level default
        // did, while still being independently adjustable afterward.
        const current = w.tabs.find((t) => t.id === w.activeTabId) || w.tabs[0];
        const newTab = {
          id: tabId,
          module,
          title,
          reference: w.kind === 'dictionary' ? undefined : current?.reference || 'John 3:16',
          syncGroup: w.kind === 'dictionary' ? null : current?.syncGroup ?? 'A',
        };
        return { ...w, tabs: [...w.tabs, newTab], activeTabId: tabId };
      })
    );
    setActiveWindowId(windowId);
  }

  function swapTabModule(windowId, tabId, module, title) {
    setWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, tabs: w.tabs.map((t) => (t.id === tabId ? { ...t, module, title } : t)) } : w))
    );
  }

  function setActiveTab(windowId, tabId) {
    setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, activeTabId: tabId } : w)));
    setActiveWindowId(windowId);
  }

  function closeTab(windowId, tabId) {
    const win = windows.find((w) => w.id === windowId);
    if (!win) return;
    if (win.tabs.length === 1) {
      closeWindow(windowId);
      return;
    }
    const remainingTabs = win.tabs.filter((t) => t.id !== tabId);
    const activeTabId = win.activeTabId === tabId ? remainingTabs[0].id : win.activeTabId;
    setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, tabs: remainingTabs, activeTabId } : w)));
  }

  function closeWindow(windowId) {
    if (windows.length === 1) return; // always keep at least one window open
    const next = windows.filter((w) => w.id !== windowId);
    setWindows(next);
    if (activeWindowId === windowId) setActiveWindowId(next[0].id);
  }

  /** Navigating one tab moves every other tab — in any window, of any
   * kind — sharing its (non-null) sync group to the same reference.
   * This is the actual link between, say, a specific commentary tab and
   * the Bible tab it should follow. */
  function navigateTab(tabId, reference) {
    setWindows((prev) => {
      let originGroup = null;
      for (const w of prev) {
        const t = w.tabs.find((t) => t.id === tabId);
        if (t) {
          originGroup = t.syncGroup;
          break;
        }
      }
      return prev.map((w) => ({
        ...w,
        tabs: w.tabs.map((t) => {
          if (t.id === tabId) return { ...t, reference };
          if (originGroup && t.syncGroup === originGroup && w.kind !== 'dictionary') return { ...t, reference };
          return t;
        }),
      }));
    });
  }

  function cycleTabSyncGroup(windowId, tabId) {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== windowId) return w;
        return {
          ...w,
          tabs: w.tabs.map((t) => {
            if (t.id !== tabId) return t;
            const idx = SYNC_GROUPS.indexOf(t.syncGroup);
            return { ...t, syncGroup: SYNC_GROUPS[(idx + 1) % SYNC_GROUPS.length] };
          }),
        };
      })
    );
  }

  function handleSearchJump(ref) {
    if (!activeTab || activeWindow?.kind === 'dictionary') return;
    navigateTab(activeTab.id, ref);
  }

  function handleStrongsClick(key, event) {
    setStrongsPopup({ key, x: event.clientX, y: event.clientY });
  }

  function handleVerseRefClick(osisRef, event) {
    setVersePopup({ osisRef, x: event.clientX, y: event.clientY });
  }

  /** "Open in tab" from the verse popup — adds a new, deliberately
   * *unlinked* tab (syncGroup: null) to the Bible window, since this is
   * a one-off lookup and shouldn't get dragged elsewhere by whatever
   * else you're navigating. */
  function openVerseTab(module, osisRef) {
    setVersePopup(null);
    const bibleWindow = windows.find((w) => w.kind === 'bible');
    const tabId = uid('tab');
    const newTab = { id: tabId, module, title: osisRef, reference: osisRef, syncGroup: null };
    if (bibleWindow) {
      setWindows((prev) => prev.map((w) => (w.id === bibleWindow.id ? { ...w, tabs: [...w.tabs, newTab], activeTabId: tabId } : w)));
      setActiveWindowId(bibleWindow.id);
    } else {
      const windowId = uid('win');
      setWindows((prev) => [...prev, { id: windowId, kind: 'bible', tabs: [newTab], activeTabId: tabId }]);
      setActiveWindowId(windowId);
    }
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-ink text-parchment">
      <header className="flex items-center gap-4 border-b border-rule px-6 py-3">
        <span className="font-display text-xl tracking-wide">Scriptorium</span>
        <SearchBar activeModule={activeTab?.module} onJump={handleSearchJump} />
        <div className="ml-auto flex items-center gap-3">
          <div className="flex overflow-hidden rounded border border-rule text-xs">
            <button
              onClick={() => setLayout('tiled')}
              className={`px-2 py-1.5 ${layout === 'tiled' ? 'bg-verdigris/30 text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              tile
            </button>
            <button
              onClick={() => setLayout('tabbed')}
              className={`px-2 py-1.5 ${layout === 'tabbed' ? 'bg-verdigris/30 text-parchment' : 'text-muted hover:text-parchment'}`}
            >
              tabs
            </button>
          </div>
          <button
            onClick={() => setShowModuleManager(true)}
            className="rounded border border-rule px-3 py-1.5 text-xs hover:border-brass"
          >
            Manage modules
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Workspace
          windows={windows}
          layout={layout}
          activeWindowId={activeWindowId}
          onFocusWindow={setActiveWindowId}
          onSetActiveTab={setActiveTab}
          onCloseTab={closeTab}
          onCloseWindow={closeWindow}
          onAddTab={addTabToWindow}
          onSwapTabModule={swapTabModule}
          onCycleTabSync={cycleTabSyncGroup}
          onNavigateTab={navigateTab}
          onStrongsClick={handleStrongsClick}
          onVerseRefClick={handleVerseRefClick}
          onAnnotate={() => setDockTab('notes')}
        />

        <div
          onMouseDown={onDockDragStart}
          className="w-1 shrink-0 cursor-col-resize bg-rule hover:bg-brass active:bg-brass"
          title="Drag to resize"
        />
        <aside className="flex min-h-0 shrink-0 flex-col border-l border-rule" style={{ width: dockWidth }}>
          <nav className="flex border-b border-rule">
            {DOCK_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setDockTab(tab)}
                className={`flex-1 py-2 text-xs uppercase tracking-wide ${
                  dockTab === tab ? 'border-b-2 border-brass text-parchment' : 'text-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
          {/* All three stay mounted and are just hidden via CSS, rather
              than conditionally rendered — otherwise switching tabs
              unmounts StudyAssistant/NotesSidebar and their state
              (the conversation, any in-progress note) is lost. */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className={dockTab === 'notes' ? 'h-full' : 'hidden'}>
              <NotesSidebar reference={activeWindow?.kind !== 'dictionary' ? activeTab?.reference : undefined} module={activeTab?.module} />
            </div>
            <div className={dockTab === 'library' ? 'h-full' : 'hidden'}>
              <Library />
            </div>
            <div className={dockTab === 'assistant' ? 'h-full' : 'hidden'}>
              <StudyAssistant sources={openSources} />
            </div>
          </div>
        </aside>
      </div>

      {showModuleManager && (
        <ModuleManager
          onClose={() => setShowModuleManager(false)}
          onOpenModule={(cfg) => {
            openModuleInWindow(cfg);
            setShowModuleManager(false);
          }}
          onModulesChanged={() => {}}
          defaultBibleModule={defaultBibleModule}
          onSetDefaultBible={setDefaultBibleModule}
        />
      )}

      {strongsPopup && (
        <StrongsPopup
          strongsKey={strongsPopup.key}
          x={strongsPopup.x}
          y={strongsPopup.y}
          onClose={() => setStrongsPopup(null)}
          onNavigateKey={(key) => setStrongsPopup((prev) => ({ ...prev, key }))}
        />
      )}

      {versePopup && (
        <VersePopup
          osisRef={versePopup.osisRef}
          module={defaultBibleModule}
          x={versePopup.x}
          y={versePopup.y}
          onClose={() => setVersePopup(null)}
          onOpenInTab={openVerseTab}
        />
      )}
    </div>
  );
}
