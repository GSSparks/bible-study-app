import ModulePicker from './ModulePicker.jsx';

const KIND_LABEL = { bible: 'Bible', commentary: 'Commentary', dictionary: 'Dictionary' };

/** Tab strip for one fixed region. Always renders (even with zero tabs)
 * so the "+" add-tab control stays visible and the region stays
 * discoverable when empty, rather than disappearing entirely. */
export default function TabStrip({ kind, tabs, activeTabId, onSetActiveTab, onCloseTab, onSwapTabModule, onAddTab }) {
  return (
    <div className="flex items-center border-b border-rule bg-panel px-2 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <span className="mr-1 shrink-0 text-xs uppercase tracking-wide text-muted">{KIND_LABEL[kind]}</span>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex shrink-0 items-center rounded text-xs whitespace-nowrap ${
              tab.id === activeTabId ? 'bg-ink text-brass' : 'text-muted'
            }`}
          >
            <button
              onClick={() => onSetActiveTab(tab.id)}
              className={`px-2 py-1 ${tab.id === activeTabId ? '' : 'hover:text-parchment'}`}
            >
              {tab.title}
            </button>
            <ModulePicker
              kind={kind}
              excludeModules={[]}
              label="▾"
              title="Change this tab's version"
              onSelect={(module, title) => onSwapTabModule(tab.id, module, title)}
            />
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="px-1.5 py-1 hover:text-red-400"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <ModulePicker
          kind={kind}
          excludeModules={[]}
          label="+"
          title={`Open another ${KIND_LABEL[kind].toLowerCase()} as a new tab — the same version can be opened more than once`}
          onSelect={(module, title) => onAddTab(module, title)}
        />
      </div>
    </div>
  );
}