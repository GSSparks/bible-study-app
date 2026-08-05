import ReaderPane from './ReaderPane.jsx';
import DictionaryPane from './DictionaryPane.jsx';
import ModulePicker from './ModulePicker.jsx';

const SYNC_COLORS = { A: '#C89B3C', B: '#3F7168', C: '#8B6DB8' };
const KIND_LABEL = { bible: 'Bible', commentary: 'Commentary', dictionary: 'Dictionary' };

export default function Window({
  win,
  isActive,
  onFocus,
  onSetActiveTab,
  onCloseTab,
  onCloseWindow,
  onAddTab,
  onSwapTabModule,
  onCycleTabSync,
  onNavigateTab,
  onStrongsClick,
  onVerseRefClick,
  onAnnotate,
}) {
  const activeTab = win.tabs.find((t) => t.id === win.activeTabId) || win.tabs[0];

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-md border ${isActive ? 'border-brass' : 'border-rule'}`}
      onMouseDown={onFocus}
    >
      <div className="flex items-center justify-between border-b border-rule bg-panel px-2 py-1">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          <span className="mr-1 shrink-0 text-xs uppercase tracking-wide text-muted">{KIND_LABEL[win.kind]}</span>
          {win.tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex shrink-0 items-center rounded text-xs whitespace-nowrap ${
                tab.id === activeTab?.id ? 'bg-ink text-brass' : 'text-muted'
              }`}
            >
              <button
                onClick={() => onSetActiveTab(win.id, tab.id)}
                className={`px-2 py-1 ${tab.id === activeTab?.id ? '' : 'hover:text-parchment'}`}
              >
                {tab.title}
              </button>
              <ModulePicker
                kind={win.kind}
                excludeModules={win.tabs.filter((t) => t.id !== tab.id).map((t) => t.module)}
                label="▾"
                title="Change this tab's version"
                onSelect={(module, title) => onSwapTabModule(win.id, tab.id, module, title)}
              />
              {win.kind !== 'dictionary' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCycleTabSync(win.id, tab.id);
                  }}
                  className="mx-0.5 h-2.5 w-2.5 shrink-0 rounded-full border border-rule"
                  style={{ backgroundColor: SYNC_COLORS[tab.syncGroup] || 'transparent' }}
                  title={
                    tab.syncGroup
                      ? `Linked (group ${tab.syncGroup}) — follows other linked tabs anywhere. Click to change.`
                      : 'Not linked — click to link'
                  }
                />
              )}
              {win.tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(win.id, tab.id);
                  }}
                  className="px-1.5 py-1 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <ModulePicker
            kind={win.kind}
            excludeModules={win.tabs.map((t) => t.module)}
            label="+"
            title="Open another version as a new tab"
            onSelect={(module, title) => onAddTab(win.id, module, title)}
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCloseWindow(win.id);
          }}
          className="ml-2 shrink-0 text-xs text-muted hover:text-red-400"
          title="Close window"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {win.kind === 'dictionary' ? (
          <DictionaryPane module={activeTab?.module} onVerseRefClick={onVerseRefClick} />
        ) : (
          <ReaderPane
            module={activeTab?.module}
            reference={activeTab?.reference}
            onNavigate={(ref) => onNavigateTab(activeTab.id, ref)}
            onStrongsClick={onStrongsClick}
            onVerseRefClick={onVerseRefClick}
            onAnnotate={onAnnotate}
          />
        )}
      </div>
    </div>
  );
}
