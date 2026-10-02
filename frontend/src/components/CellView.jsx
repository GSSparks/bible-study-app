import { useEffect, useState } from 'react';
import SearchBar from './SearchBar.jsx';
import StrongsPopup from './StrongsPopup.jsx';
import VersePopup from './VersePopup.jsx';
import ReaderPane from './ReaderPane.jsx';
import DictionaryPane from './DictionaryPane.jsx';
import TabStrip from './TabStrip.jsx';
import { api } from '../api/client.js';
import { useResizableWidth } from '../hooks/useResizableWidth.js';
import { useResizableHeight } from '../hooks/useResizableHeight.js';
import { useTabbedWindow } from '../hooks/useTabbedWindow.js';
import { simplifyForTopicalSearch } from '../utils/searchStem.js';

/** The personal study space — named "Cell" after the monk's private
 * chamber where individual Scripture study happens. Three panes:
 * Bible (anchor), Commentary, Dictionary. On lg+ screens all three are
 * visible simultaneously in a resizable layout; on smaller screens a
 * tab bar switches between them one at a time. The AI chat dock that
 * used to live here has moved to its own AI Companion page — "Ask
 * about this" and phrase-study actions now route there via callbacks
 * rather than showing inline. */
export default function CellView({
  auth,
  onNavigateToLibrary,
  pendingBibleOpen,
  onBibleOpenConsumed,
  defaultBibleModule,
  onAskAiCompanionAbout,
  onAskAiCompanionPhraseStudy,
}) {
  const [focusedReference, setFocusedReference] = useState('John 3:16');
  const [navHistory, setNavHistory] = useState({ entries: ['John 3:16'], index: 0 });
  const bible = useTabbedWindow([{ id: 'bible-0', module: '', title: 'Bible' }]);
  const commentary = useTabbedWindow([]);
  const dictionary = useTabbedWindow([]);

  const [strongsPopup, setStrongsPopup] = useState(null);
  const [versePopup, setVersePopup] = useState(null);
  const [pendingDictKey, setPendingDictKey] = useState(null);
  const [pendingDictFilter, setPendingDictFilter] = useState(null);
  const [pendingDictTabId, setPendingDictTabId] = useState(null);
  const [activePane, setActivePane] = useState('bible'); // mobile tab

  const { width: rightWidth, onDragStart: onRightDragStart } = useResizableWidth({
    key: 'cell-right-width',
    defaultWidth: 420,
    min: 260,
    max: 900,
    side: 'left',
  });
  const { height: dictHeight, onDragStart: onDictDragStart } = useResizableHeight({
    key: 'cell-dict-height',
    defaultHeight: 260,
    min: 100,
    max: 600,
    side: 'top',
  });

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

  useEffect(() => {
    if (!pendingBibleOpen) return;
    navigateFocus(pendingBibleOpen.reference);
    bible.addTab(pendingBibleOpen.module, pendingBibleOpen.module);
    onBibleOpenConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBibleOpen?.nonce]);

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

  function handleStrongsClick(key, event, morph, wordText, module) {
    setStrongsPopup({ key, x: event.clientX, y: event.clientY, morph, wordText, module });
  }

  function handleVerseRefClick(osisRef, event) {
    setVersePopup({ osisRef, x: event.clientX, y: event.clientY });
  }

  function handleAskAboutPassage(module, reference) {
    onAskAiCompanionAbout?.(module, reference);
  }

  function handlePhraseStudy(phrase, module, strongsSequence) {
    onAskAiCompanionPhraseStudy?.(phrase, module, strongsSequence);
  }

  function openVerseTab(module, osisRef) {
    setVersePopup(null);
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
      if (!match) return;
      const existingTab = dictionary.tabs.find((t) => t.module === match.name);
      const targetTabId = existingTab ? existingTab.id : dictionary.addTab(match.name, match.description || match.name);
      if (existingTab) dictionary.setActiveTabId(existingTab.id);
      setPendingDictKey(dictKey);
      setPendingDictFilter(null);
      setPendingDictTabId(targetTabId);
      setActivePane('dictionary'); // auto-switch on mobile
    });
  }

  function openTopicalSearch(word) {
    if (!word) return;
    const searchTerm = simplifyForTopicalSearch(word);
    api.listInstalledModules('DICT').then((mods) => {
      const match = mods.find((m) => /topical|nave/i.test(`${m.name} ${m.description || ''}`));
      if (!match) return;
      const existingTab = dictionary.tabs.find((t) => t.module === match.name);
      const targetTabId = existingTab ? existingTab.id : dictionary.addTab(match.name, match.description || match.name);
      if (existingTab) dictionary.setActiveTabId(existingTab.id);
      setPendingDictKey(null);
      setPendingDictFilter(searchTerm);
      setPendingDictTabId(targetTabId);
      setActivePane('dictionary');
    });
  }

  const sharedReaderProps = {
    reference: focusedReference,
    onNavigate: navigateFocus,
    onStrongsClick: handleStrongsClick,
    onVerseRefClick: handleVerseRefClick,
    onAnnotate: onNavigateToLibrary,
    onAskAboutPassage: handleAskAboutPassage,
    onPhraseStudy: handlePhraseStudy,
  };

  const dictPaneProps = {
    focusedReference,
    onVerseRefClick: handleVerseRefClick,
    onStrongsClick: handleStrongsClick,
    onOpenInDictionary: openStrongsInDictionary,
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Navigation bar ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-rule px-4 py-2 sm:gap-4 sm:px-6">
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
        <div className="min-w-0 flex-1">
          <SearchBar activeModule={bible.activeTab?.module} onJump={navigateFocus} />
        </div>
      </div>

      {/* ── Mobile pane tab bar (hidden on lg+) ── */}
      <div className="flex shrink-0 border-b border-rule lg:hidden">
        {[
          { key: 'bible', label: 'Bible' },
          { key: 'commentary', label: 'Commentary' },
          { key: 'dictionary', label: 'Dictionary' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActivePane(key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activePane === key ? 'border-b-2 border-brass text-brass' : 'text-muted hover:text-parchment'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="min-h-0 flex-1 overflow-hidden">

        {/* ── MOBILE layout (hidden on lg+) ── */}
        <div className="flex h-full flex-col lg:hidden">
          <MobilePane visible={activePane === 'bible'}>
            <TabStrip kind="bible" tabs={bible.tabs} activeTabId={bible.activeTabId} onSetActiveTab={bible.setActiveTabId} onCloseTab={bible.closeTab} onSwapTabModule={bible.swapTabModule} onAddTab={bible.addTab} />
            <div className="min-h-0 flex-1 overflow-hidden">
              {bible.tabs.map((tab) => (
                <div key={tab.id} className={tab.id === bible.activeTabId ? 'h-full' : 'hidden'}>
                  <ReaderPane {...sharedReaderProps} module={tab.module} focusMode />
                </div>
              ))}
            </div>
          </MobilePane>

          <MobilePane visible={activePane === 'commentary'}>
            <TabStrip kind="commentary" tabs={commentary.tabs} activeTabId={commentary.activeTabId} onSetActiveTab={commentary.setActiveTabId} onCloseTab={commentary.closeTab} onSwapTabModule={commentary.swapTabModule} onAddTab={commentary.addTab} />
            <div className="min-h-0 flex-1 overflow-hidden">
              {commentary.tabs.length === 0
                ? <EmptyPane label="No commentaries open — tap + above to add one." />
                : commentary.tabs.map((tab) => (
                    <div key={tab.id} className={tab.id === commentary.activeTabId ? 'h-full' : 'hidden'}>
                      <ReaderPane {...sharedReaderProps} module={tab.module} />
                    </div>
                  ))}
            </div>
          </MobilePane>

          <MobilePane visible={activePane === 'dictionary'}>
            <TabStrip kind="dictionary" tabs={dictionary.tabs} activeTabId={dictionary.activeTabId} onSetActiveTab={dictionary.setActiveTabId} onCloseTab={dictionary.closeTab} onSwapTabModule={dictionary.swapTabModule} onAddTab={dictionary.addTab} />
            <div className="min-h-0 flex-1 overflow-hidden">
              {dictionary.tabs.length === 0
                ? <EmptyPane label="No dictionaries open — tap + above to add one." />
                : dictionary.tabs.map((tab) => (
                    <div key={tab.id} className={tab.id === dictionary.activeTabId ? 'h-full' : 'hidden'}>
                      <DictionaryPane
                        {...dictPaneProps}
                        module={tab.module}
                        initialKey={tab.id === pendingDictTabId ? pendingDictKey : null}
                        initialFilter={tab.id === pendingDictTabId ? pendingDictFilter : null}
                      />
                    </div>
                  ))}
            </div>
          </MobilePane>
        </div>

        {/* ── DESKTOP layout (hidden below lg) ──
            Bible fills the left column; Commentary (top) + Dictionary
            (bottom) share the right column. Dictionary moved here from
            the old bottom-left so it sits next to the commentary — more
            natural when looking up words that appear in a note. */}
        <div className="hidden h-full lg:flex">
          {/* Bible — left, takes all remaining width */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 pr-1">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-rule">
              <TabStrip kind="bible" tabs={bible.tabs} activeTabId={bible.activeTabId} onSetActiveTab={bible.setActiveTabId} onCloseTab={bible.closeTab} onSwapTabModule={bible.swapTabModule} onAddTab={bible.addTab} />
              <div className="min-h-0 flex-1 overflow-hidden">
                {bible.tabs.map((tab) => (
                  <div key={tab.id} className={tab.id === bible.activeTabId ? 'h-full' : 'hidden'}>
                    <ReaderPane {...sharedReaderProps} module={tab.module} focusMode />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column drag handle */}
          <div
            onMouseDown={onRightDragStart}
            className="w-1 shrink-0 cursor-col-resize bg-rule hover:bg-brass active:bg-brass"
            title="Drag to resize"
          />

          {/* Right column: Commentary (top, flex-1) + Dictionary (bottom, fixed height) */}
          <div className="flex shrink-0 flex-col overflow-hidden p-2 pl-1" style={{ width: rightWidth }}>
            {/* Commentary */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-rule">
              <TabStrip kind="commentary" tabs={commentary.tabs} activeTabId={commentary.activeTabId} onSetActiveTab={commentary.setActiveTabId} onCloseTab={commentary.closeTab} onSwapTabModule={commentary.swapTabModule} onAddTab={commentary.addTab} />
              <div className="min-h-0 flex-1 overflow-hidden">
                {commentary.tabs.length === 0
                  ? <EmptyPane label="No commentaries open — click + above to add one." />
                  : commentary.tabs.map((tab) => (
                      <div key={tab.id} className={tab.id === commentary.activeTabId ? 'h-full' : 'hidden'}>
                        <ReaderPane {...sharedReaderProps} module={tab.module} />
                      </div>
                    ))}
              </div>
            </div>

            {/* Row drag handle */}
            <div
              onMouseDown={onDictDragStart}
              className="h-1 shrink-0 cursor-row-resize bg-rule hover:bg-brass active:bg-brass"
              title="Drag to resize"
            />

            {/* Dictionary */}
            <div
              className="flex shrink-0 flex-col overflow-hidden rounded-md border border-rule"
              style={{ height: dictHeight }}
            >
              <TabStrip kind="dictionary" tabs={dictionary.tabs} activeTabId={dictionary.activeTabId} onSetActiveTab={dictionary.setActiveTabId} onCloseTab={dictionary.closeTab} onSwapTabModule={dictionary.swapTabModule} onAddTab={dictionary.addTab} />
              <div className="min-h-0 flex-1 overflow-hidden">
                {dictionary.tabs.length === 0
                  ? <EmptyPane label="No dictionaries or help books open — click + above to add one." />
                  : dictionary.tabs.map((tab) => (
                      <div key={tab.id} className={tab.id === dictionary.activeTabId ? 'h-full' : 'hidden'}>
                        <DictionaryPane
                          {...dictPaneProps}
                          module={tab.module}
                          initialKey={tab.id === pendingDictTabId ? pendingDictKey : null}
                          initialFilter={tab.id === pendingDictTabId ? pendingDictFilter : null}
                        />
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating popups ── */}
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

function MobilePane({ visible, children }) {
  return (
    <div className={`${visible ? 'flex' : 'hidden'} h-full flex-col overflow-hidden`}>
      {children}
    </div>
  );
}

function EmptyPane({ label }) {
  return (
    <div className="flex h-full items-center justify-center bg-page px-6 text-center text-sm text-pageMuted">
      {label}
    </div>
  );
}
