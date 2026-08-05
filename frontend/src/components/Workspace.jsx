import Window from './Window.jsx';

export default function Workspace({
  windows,
  layout,
  activeWindowId,
  onFocusWindow,
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
  function renderWindow(win) {
    return (
      <Window
        key={win.id}
        win={win}
        isActive={win.id === activeWindowId}
        onFocus={() => onFocusWindow(win.id)}
        onSetActiveTab={onSetActiveTab}
        onCloseTab={onCloseTab}
        onCloseWindow={onCloseWindow}
        onAddTab={onAddTab}
        onSwapTabModule={onSwapTabModule}
        onCycleTabSync={onCycleTabSync}
        onNavigateTab={onNavigateTab}
        onStrongsClick={onStrongsClick}
        onVerseRefClick={onVerseRefClick}
        onAnnotate={onAnnotate}
      />
    );
  }

  if (layout === 'tabbed') {
    const active = windows.find((w) => w.id === activeWindowId) || windows[0];
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex overflow-x-auto border-b border-rule bg-panel">
          {windows.map((win) => (
            <div
              key={win.id}
              onClick={() => onFocusWindow(win.id)}
              className={`flex shrink-0 items-center gap-2 border-r border-rule px-3 py-2 text-xs cursor-pointer ${
                win.id === active?.id ? 'bg-ink text-brass' : 'text-muted hover:text-parchment'
              }`}
            >
              {win.kind} {windows.filter((w) => w.kind === win.kind).length > 1 ? `(${win.id})` : ''}
              {windows.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseWindow(win.id);
                  }}
                  className="hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{active && renderWindow(active)}</div>
      </div>
    );
  }

  // Tiled: simple grid, column count grows with window count. In normal
  // use this is usually 1-3 windows (Bible, Commentary, Dictionary) since
  // opening another translation adds a tab rather than a new window.
  const cols = windows.length <= 1 ? 1 : windows.length <= 4 ? 2 : 3;

  return (
    <div
      className="min-h-0 flex-1 gap-2 overflow-auto p-2"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: 'minmax(320px, 1fr)' }}
    >
      {windows.map(renderWindow)}
    </div>
  );
}
