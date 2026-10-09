import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import SearchBar from './SearchBar.jsx';
import ReaderPane from './ReaderPane.jsx';
import TabStrip from './TabStrip.jsx';
import StrongsDrawer from './StrongsDrawer.jsx';
import VerseDrawer from './VerseDrawer.jsx';
import { useTabbedWindow } from '../hooks/useTabbedWindow.js';
import { api } from '../api/client.js';

export default function BiblePanel({ open, onClose, pendingOpen, onPendingConsumed, defaultBibleModule }) {
  const [reference, setReference] = useState('John 3:16');
  const [navHistory, setNavHistory] = useState({ entries: ['John 3:16'], index: 0 });
  const bible = useTabbedWindow([{ id: 'panel-0', module: '', title: 'Bible' }]);
  const [strongsDrawer, setStrongsDrawer] = useState(null);
  const [verseDrawer, setVerseDrawer] = useState(null);

  useEffect(() => {
    api.listInstalledModules('BIBLE').then((mods) => {
      if (mods.length === 0) return;
      const preferred = mods.find((m) => m.name === defaultBibleModule) || mods[0];
      const first = bible.tabs[0];
      if (first && !first.module) {
        bible.swapTabModule(first.id, preferred.name, preferred.description || preferred.name);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingOpen) return;
    navigateTo(pendingOpen.reference);
    if (pendingOpen.module && pendingOpen.module !== bible.activeTab?.module) {
      bible.addTab(pendingOpen.module, pendingOpen.module);
    }
    onPendingConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpen?.nonce]);

  function navigateTo(ref) {
    if (ref === reference) return;
    setReference(ref);
    setNavHistory((prev) => {
      const truncated = prev.entries.slice(0, prev.index + 1);
      return { entries: [...truncated, ref], index: truncated.length };
    });
  }

  function goBack() {
    if (navHistory.index <= 0) return;
    const i = navHistory.index - 1;
    setReference(navHistory.entries[i]);
    setNavHistory((prev) => ({ ...prev, index: i }));
  }

  function goForward() {
    if (navHistory.index >= navHistory.entries.length - 1) return;
    const i = navHistory.index + 1;
    setReference(navHistory.entries[i]);
    setNavHistory((prev) => ({ ...prev, index: i }));
  }

  return (
    <>
      {/* Mobile backdrop — only on small screens */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel — always mounted so tab/scroll state persists */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-pageBorder bg-page shadow-2xl transition-transform duration-300 ease-in-out sm:w-[500px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-rule bg-panel px-3 py-2">
          <div className="flex shrink-0 gap-1">
            <button
              onClick={goBack}
              disabled={navHistory.index <= 0}
              title="Back"
              className="rounded border border-rule px-2 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-muted"
            >
              ‹
            </button>
            <button
              onClick={goForward}
              disabled={navHistory.index >= navHistory.entries.length - 1}
              title="Forward"
              className="rounded border border-rule px-2 py-1.5 text-xs text-muted hover:border-brass hover:text-parchment disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-muted"
            >
              ›
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <SearchBar activeModule={bible.activeTab?.module} onJump={navigateTo} />
          </div>
          <button
            onClick={onClose}
            title="Close panel (Ctrl+B)"
            className="shrink-0 rounded p-1 text-muted hover:text-parchment"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab strip */}
        <TabStrip
          kind="bible"
          tabs={bible.tabs}
          activeTabId={bible.activeTabId}
          onSetActiveTab={bible.setActiveTabId}
          onCloseTab={bible.closeTab}
          onSwapTabModule={bible.swapTabModule}
          onAddTab={bible.addTab}
        />

        {/* Reader */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {bible.tabs.map((tab) => (
            <div key={tab.id} className={tab.id === bible.activeTabId ? 'h-full' : 'hidden'}>
              <ReaderPane
                module={tab.module}
                reference={reference}
                onNavigate={navigateTo}
                onStrongsClick={(key, event, morph, wordText, module) => {
                  setVerseDrawer(null);
                  setStrongsDrawer({ key, morph, wordText, module });
                }}
                onVerseRefClick={(osisRef) => {
                  setStrongsDrawer(null);
                  setVerseDrawer({ osisRef });
                }}
                focusMode
              />
            </div>
          ))}
        </div>

        {/* Drawers — inline at bottom of panel, mutually exclusive */}
        {strongsDrawer && (
          <StrongsDrawer
            strongsKey={strongsDrawer.key}
            morph={strongsDrawer.morph}
            wordText={strongsDrawer.wordText}
            module={strongsDrawer.module}
            onClose={() => setStrongsDrawer(null)}
            onNavigateKey={(key) => setStrongsDrawer((prev) => ({ ...prev, key, morph: undefined }))}
          />
        )}
        {verseDrawer && (
          <VerseDrawer
            osisRef={verseDrawer.osisRef}
            module={defaultBibleModule}
            onClose={() => setVerseDrawer(null)}
            onOpenInTab={(module, osisRef) => {
              setVerseDrawer(null);
              navigateTo(osisRef);
              if (module && module !== bible.activeTab?.module) {
                bible.addTab(module, osisRef);
              }
            }}
          />
        )}
      </div>
    </>
  );
}
