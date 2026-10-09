import DocumentPicker from './DocumentPicker.jsx';

/** Tab strip for the Documents panel in Cell — mirrors TabStrip but uses
 * DocumentPicker (document list) instead of ModulePicker (SWORD modules). */
export default function DocumentTabStrip({ tabs, activeTabId, onSetActiveTab, onCloseTab, onSwapTab, onAddTab }) {
  return (
    <div className="flex items-center border-b border-rule bg-panel px-2 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <span className="mr-1 shrink-0 text-xs uppercase tracking-wide text-muted">Documents</span>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex shrink-0 items-center rounded text-xs whitespace-nowrap ${
              tab.id === activeTabId ? 'bg-ink text-brass' : 'text-muted'
            }`}
          >
            <button
              onClick={() => onSetActiveTab(tab.id)}
              className={`max-w-[140px] truncate px-2 py-1 ${tab.id === activeTabId ? '' : 'hover:text-parchment'}`}
              title={tab.title}
            >
              {tab.title}
            </button>
            <DocumentPicker
              label="▾"
              title="Change document in this tab"
              onSelect={(docId, title) => onSwapTab(tab.id, docId, title)}
            />
            {tabs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                className="px-1.5 py-1 hover:text-red-400"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <DocumentPicker
          label="+"
          title="Open a document in a new tab"
          onSelect={(docId, title) => onAddTab(docId, title)}
        />
      </div>
    </div>
  );
}
