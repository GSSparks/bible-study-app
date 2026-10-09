import { useEffect, useState } from 'react';
import MainLayout from './MainLayout.jsx';
import SearchBar from './SearchBar.jsx';
import StrongsPopup from './StrongsPopup.jsx';
import StudyAssistant from './StudyAssistant.jsx';
import { api } from '../api/client.js';
import { useResizableWidth } from '../hooks/useResizableWidth.js';
import { useTabbedWindow } from '../hooks/useTabbedWindow.js';
import { simplifyForTopicalSearch } from '../utils/searchStem.js';

/** The pre-existing power-user reading/study experience — the 3-pane
 * Bible/commentary/dictionary layout, Strong's word-clicking, phrase
 * studies, the notes/library/assistant dock. Moved out of App.jsx
 * verbatim (not rewritten) as part of the shell restructuring, so it
 * behaves exactly as it did before, just re-homed under the new
 * Passages nav item instead of being the entire app.
 *
 * Takes `auth` as a prop rather than calling useAuth() itself —
 * calling the hook a second time here would mean two independent
 * copies of auth state that could drift out of sync with the one in
 * AppShell (logging out via one copy wouldn't update the other).
 */
export default function StudyMode({ auth, onNavigateToLibrary, pendingBibleOpen, onBibleOpenConsumed, defaultBibleModule }) {
  const [focusedReference, setFocusedReference] = useState('John 3:16');
  const [navHistory, setNavHistory] = useState({ entries: ['John 3:16'], index: 0 });
  const bible = useTabbedWindow([{ id: 'bible-0', module: '', title: 'Bible' }]);
  const commentary = useTabbedWindow([]);
  const dictionary = useTabbedWindow([]);

  const [strongsPopup, setStrongsPopup] = useState(null); // { key, x, y, morph }
  const [verseDrawer, setVerseDrawer] = useState(null); // { osisRef }
  const [pendingDictKey, setPendingDictKey] = useState(null);
  const [pendingDictFilter, setPendingDictFilter] = useState(null);
  const [pendingDictTabId, setPendingDictTabId] = useState(null);
  const [overviewRequest, setOverviewRequest] = useState(null); // { module, reference, nonce }
  const [wordStudyRequest, setWordStudyRequest] = useState(null); // { module, strongsKey, nonce }
  const [phraseStudyRequest, setPhraseStudyRequest] = useState(null); // { module, phrase, strongsSequence, nonce }

  const { width: dockWidth, onDragStart: onDockDragStart } = useResizableWidth({
    key: 'scriptorium-dock-width',
    defaultWidth: 384,
    min: 280,
    max: 720,
    side: 'left',
  });

  // Waits on auth.loading/setupRequired deliberately, not just an empty
  // dependency array — every /api/* route except the auth ones is
  // blocked until setup completes, so firing this before that resolves
  // would fail silently (already swallowed by the catch below) and,
  // critically, never retry: with an empty dependency array this would
  // have run exactly once, during the pending-bootstrap window, and
  // left the Bible pane permanently unpopulated even after a
  // successful bootstrap. Re-running when setupRequired flips to false
  // is what actually loads the default module at the right time.
  useEffect(() => {
    if (auth.loading || auth.setupRequired) return;
    api
      .listInstalledModules('BIBLE')
      .then((mods) => {
        if (mods.length === 0) return;
        const preferred = mods.find((m) => m.name === defaultBibleModule) || mods[0];
        const firstTab = bible.tabs[0];
        if (firstTab && !firstTab.module) {
          bible.swapTabModule(firstTab.id, preferred.name, preferred.description || preferred.name);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.setupRequired]);

  // Deep-link from another view (e.g. "open in Passages" from a Study
  // lesson) — always opens a genuinely NEW tab rather than reusing or
  // replacing the current one, so whatever was already open stays
  // exactly as it was. Watches the nonce, not the raw module/reference,
  // since a second request for the identical passage should still open
  // a second tab, not silently no-op against an unchanged value.
  //
  // Explicitly clears the pending request in AppShell once consumed
  // (onBibleOpenConsumed) — this view stays mounted permanently (see
  // AppShell's visibility-toggle wrapper), so it isn't strictly at risk
  // of re-firing against a stale nonce the way a view that unmounts
  // would be, but clearing it anyway keeps this consistent with how
  // every other pending-request consumer in the app now behaves.
  useEffect(() => {
    if (!pendingBibleOpen) return;
    navigateFocus(pendingBibleOpen.reference);
    bible.addTab(pendingBibleOpen.module, pendingBibleOpen.module);
    onBibleOpenConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBibleOpen?.nonce]);

  const openSources = [
    ...bible.tabs.map((t) => ({ module: t.module, reference: focusedReference, kind: 'bible', title: t.title })),
    ...commentary.tabs.map((t) => ({ module: t.module, reference: focusedReference, kind: 'commentary', title: t.title })),
  ];

  /** All navigation goes through here, giving it the one shared history
   * used for back/forward — classic browser semantics: navigating to a
   * new reference truncates any "forward" entries past the current
   * point and appends the new one; goBack/goForward just move the index
   * without touching the list itself. Skips pushing a duplicate entry
   * if the reference didn't actually change (clicking the same verse
   * number twice, say), so history doesn't fill up with no-ops. */
  function navigateFocus(reference) {
    if (reference === focusedReference) return;
    setFocusedReference(reference);
    setNavHistory((prev) => {
      const truncated = prev.entries.slice(0, prev.index + 1);
      return { entries: [...truncated, reference], index: truncated.length };
    });
  }

  function goBack() {
    if (navHistory.index <= 0) return;
    const newIndex = navHistory.index - 1;
    setFocusedReference(navHistory.entries[newIndex]);
    setNavHistory({ ...navHistory, index: newIndex });
  }

  function goForward() {
    if (navHistory.index >= navHistory.entries.length - 1) return;
    const newIndex = navHistory.index + 1;
    setFocusedReference(navHistory.entries[newIndex]);
    setNavHistory({ ...navHistory, index: newIndex });
  }

  function handleSearchJump(ref) {
    navigateFocus(ref);
  }

  function handleStrongsClick(key, event, morph, wordText, module) {
    setStrongsPopup({ key, x: event.clientX, y: event.clientY, morph, wordText, module });
  }

  function handleVerseRefClick(osisRef) {
    setVerseDrawer({ osisRef });
  }

  function handleWordStudy(strongsKey, module) {
    setWordStudyRequest({ module, strongsKey, nonce: Date.now() });
  }

  /** "Study this phrase" from ReaderPane's text-selection toolbar.
   * `strongsSequence` is present only for the "original words" button —
   * undefined for the "exact wording" button, which is how
   * StudyAssistant distinguishes which matching mode to run. */
  function handlePhraseStudy(phrase, module, strongsSequence) {
    setPhraseStudyRequest({ module, phrase, strongsSequence, nonce: Date.now() });
  }

  function handleAskAboutPassage(module, reference) {
    setOverviewRequest({ module, reference, nonce: Date.now() });
  }

  function openVerseTab(module, osisRef) {
    setVerseDrawer(null);
    navigateFocus(osisRef);
    if (bible.activeTab?.module !== module) {
      bible.addTab(module, osisRef);
    }
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
      if (!match) {
        console.warn(`No installed Strong's dictionary module found for ${lang} (looking up ${strongsKey}).`);
        return;
      }
      const existingTab = dictionary.tabs.find((t) => t.module === match.name);
      const targetTabId = existingTab ? existingTab.id : dictionary.addTab(match.name, match.description || match.name);
      if (existingTab) dictionary.setActiveTabId(existingTab.id);
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
      if (!match) {
        console.warn(`No installed topical Bible (e.g. Nave's) found to search for "${word}".`);
        return;
      }
      const existingTab = dictionary.tabs.find((t) => t.module === match.name);
      const targetTabId = existingTab ? existingTab.id : dictionary.addTab(match.name, match.description || match.name);
      if (existingTab) dictionary.setActiveTabId(existingTab.id);
      setPendingDictKey(null);
      setPendingDictFilter(searchTerm);
      setPendingDictTabId(targetTabId);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Back/forward and search moved here from the old global header —
          they're about navigating Bible references, a Study Mode
          concept, not something that belongs above a social feed or a
          Scriptorium page. "Manage modules" used to live here too for
          the same reason (it directly manipulated this component's own
          tabbed-window state) — but install/remove/upload are
          fundamentally admin tasks, not reading-session ones, so that
          moved to Admin's own Modules tab. Opening a module into a new
          pane is unaffected — that's TabStrip's own "+" button, which
          never went through this component at all. */}
      <div className="flex items-center gap-4 border-b border-rule px-6 py-3">
        <div className="flex gap-1">
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
        <SearchBar activeModule={bible.activeTab?.module} onJump={handleSearchJump} />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <MainLayout
          bible={bible}
          commentary={commentary}
          dictionary={dictionary}
          focusedReference={focusedReference}
          pendingDictKey={pendingDictKey}
          pendingDictFilter={pendingDictFilter}
          pendingDictTabId={pendingDictTabId}
          onNavigateFocus={navigateFocus}
          onStrongsClick={handleStrongsClick}
          onVerseRefClick={handleVerseRefClick}
          onOpenInDictionary={openStrongsInDictionary}
          onAnnotate={onNavigateToLibrary}
          onAskAboutPassage={handleAskAboutPassage}
          onPhraseStudy={handlePhraseStudy}
          verseDrawer={verseDrawer}
          onCloseVerseDrawer={() => setVerseDrawer(null)}
          onOpenVerseTab={openVerseTab}
          defaultBibleModule={defaultBibleModule}
        />

        <div
          onMouseDown={onDockDragStart}
          className="w-1 shrink-0 cursor-col-resize bg-rule hover:bg-brass active:bg-brass"
          title="Drag to resize"
        />
        <aside className="flex min-h-0 shrink-0 flex-col border-l border-rule" style={{ width: dockWidth }}>
          {/* Notes and Library moved out to their own top-level page —
              this dock now only ever holds the Assistant, so the tab
              strip that used to switch between three sections is gone;
              nothing left to switch between. */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <StudyAssistant
              sources={openSources}
              overviewRequest={overviewRequest}
              wordStudyRequest={wordStudyRequest}
              phraseStudyRequest={phraseStudyRequest}
              isLoggedIn={Boolean(auth.user)}
            />
          </div>
        </aside>
      </div>

      {strongsPopup && (
        <StrongsPopup
          strongsKey={strongsPopup.key}
          morph={strongsPopup.morph}
          wordText={strongsPopup.wordText}
          module={strongsPopup.module}
          x={strongsPopup.x}
          y={strongsPopup.y}
          onClose={() => setStrongsPopup(null)}
          onNavigateKey={(key) => setStrongsPopup((prev) => ({ ...prev, key, morph: undefined }))}
          onOpenInDictionary={openStrongsInDictionary}
          onSearchTopical={openTopicalSearch}
          onWordStudy={handleWordStudy}
        />
      )}

    </div>
  );
}