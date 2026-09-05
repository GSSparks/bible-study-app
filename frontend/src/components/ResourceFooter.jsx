import { useState } from 'react';

/**
 * A thin footer bar with tabs, each expanding a drawer upward when
 * clicked — click again (or another tab) to switch, click the same
 * tab again to collapse entirely. Deliberately generic: it knows
 * nothing about "resources" or "studies" — each tab supplies its own
 * `content` as a React element, mounted only while that tab is open
 * (so an unopened tab never fetches anything, and each tab's own
 * component is free to manage its own data-fetching via a normal
 * useEffect once mounted).
 *
 * tabs: [{ id, label, content: <SomeComponent .../> }]
 */
export default function ResourceFooter({ tabs }) {
  const [activeTabId, setActiveTabId] = useState(null);

  if (!tabs || tabs.length === 0) return null;

  function toggle(id) {
    setActiveTabId((prev) => (prev === id ? null : id));
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="border-t border-rule">
      {activeTab && (
        <div className="max-h-64 overflow-y-auto border-b border-rule bg-panel p-4">{activeTab.content}</div>
      )}
      <div className="flex gap-1 overflow-x-auto p-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className={`shrink-0 rounded-t px-3 py-1.5 text-xs ${
              activeTabId === t.id ? 'bg-panel text-brass' : 'text-muted hover:bg-panel hover:text-parchment'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}