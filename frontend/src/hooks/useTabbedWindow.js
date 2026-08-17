import { useState } from 'react';

let nextTabId = 1;
const uid = () => `tab-${nextTabId++}`;

/** One region's tab state (Bible / Commentary / Dictionary each get
 * their own instance of this). Deliberately doesn't exclude
 * already-open modules when adding — the same Bible translation can
 * now be opened in more than one tab, since there's no longer a
 * per-tab reference to differentiate them by; they're all just
 * different ways of looking at the one shared focused verse. */
export function useTabbedWindow(initial = []) {
  const [tabs, setTabs] = useState(initial);
  const [activeTabId, setActiveTabId] = useState(initial[0]?.id || null);

  function addTab(module, title) {
    const id = uid();
    setTabs((prev) => [...prev, { id, module, title }]);
    setActiveTabId(id);
    return id;
  }

  function closeTab(id) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) setActiveTabId(next[0]?.id || null);
      return next;
    });
  }

  function swapTabModule(id, module, title) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, module, title } : t)));
  }

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  return { tabs, activeTabId, activeTab, setActiveTabId, addTab, closeTab, swapTabModule };
}