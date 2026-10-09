import { useState } from 'react';

let nextId = 1;
function uid() { return `wp-${nextId++}`; }

export const PANE_TYPES = [
  { value: 'bible', label: 'Bible', moduleType: 'BIBLE' },
  { value: 'commentary', label: 'Commentary', moduleType: 'COMMENTARY' },
  { value: 'dictionary', label: 'Dictionary', moduleType: 'DICT' },
  { value: 'parallel', label: 'Parallel Bible', moduleType: null },
  { value: 'crossrefs', label: 'Cross-References', moduleType: null },
  { value: 'passageguide', label: 'Passage Guide', moduleType: null },
  { value: 'document', label: 'Documents', moduleType: 'document' },
];

function makeTab(module = '', title = '') {
  return { id: uid(), module, title };
}

function makePane(type = 'bible') {
  const needsTabs = ['bible', 'commentary', 'dictionary', 'document'].includes(type);
  const tabs = needsTabs ? [makeTab()] : [];
  return { id: uid(), type, tabs, activeTabId: tabs[0]?.id ?? null, flex: 1 };
}

function makeColumn(type = 'bible', flex = 1) {
  return { id: uid(), flex, rows: [makePane(type)] };
}

function defaultLayout() {
  return [makeColumn('bible', 1), makeColumn('commentary', 0.65)];
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('workspace-layout-v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Re-assign live IDs so uid counter stays consistent, and restore
    // activeTabId from the saved activeTabIndex (tabs get new IDs on every load).
    return parsed.map((col) => ({
      ...col,
      id: uid(),
      rows: (col.rows || []).map((row) => {
        const tabs = (row.tabs || []).map((tab) => ({ ...tab, id: uid() }));
        const idx = typeof row.activeTabIndex === 'number' ? row.activeTabIndex : 0;
        const activeTabId = tabs[idx]?.id ?? tabs[0]?.id ?? null;
        const type = row.type === 'aichat' ? 'passageguide' : row.type;
        return { ...row, id: uid(), type, tabs, activeTabId };
      }),
    }));
  } catch {
    return null;
  }
}

function saveToStorage(columns) {
  try {
    const slim = columns.map((col) => ({
      flex: col.flex,
      rows: col.rows.map((row) => ({
        type: row.type,
        flex: row.flex,
        tabs: row.tabs.map(({ module, title }) => ({ module, title })),
        activeTabIndex: row.tabs.findIndex((t) => t.id === row.activeTabId),
      })),
    }));
    localStorage.setItem('workspace-layout-v1', JSON.stringify(slim));
  } catch {}
}

export function useWorkspaceLayout() {
  const [columns, setColumns] = useState(() => loadFromStorage() ?? defaultLayout());

  function update(fn) {
    setColumns((prev) => {
      const next = fn(prev);
      saveToStorage(next);
      return next;
    });
  }

  function addColumn(type = 'commentary') {
    update((cols) => [...cols, makeColumn(type, 0.65)]);
  }

  function removePane(colId, rowId) {
    update((cols) => {
      const col = cols.find((c) => c.id === colId);
      if (!col) return cols;
      if (col.rows.length === 1) {
        // Remove the whole column if it's the last pane, but keep at least one column
        const next = cols.filter((c) => c.id !== colId);
        return next.length > 0 ? next : cols;
      }
      return cols.map((c) =>
        c.id === colId ? { ...c, rows: c.rows.filter((r) => r.id !== rowId) } : c
      );
    });
  }

  function splitPane(colId, rowId, type = 'crossrefs') {
    let newPaneId = null;
    update((cols) =>
      cols.map((col) => {
        if (col.id !== colId) return col;
        const idx = col.rows.findIndex((r) => r.id === rowId);
        if (idx === -1) return col;
        const newPane = makePane(type);
        newPaneId = newPane.id;
        const rows = [...col.rows];
        rows.splice(idx + 1, 0, newPane);
        return { ...col, rows };
      })
    );
    return newPaneId;
  }

  function setPaneType(colId, rowId, type) {
    update((cols) =>
      cols.map((col) =>
        col.id !== colId
          ? col
          : {
              ...col,
              rows: col.rows.map((row) => {
                if (row.id !== rowId) return row;
                const needsTabs = ['bible', 'commentary', 'dictionary', 'document'].includes(type);
                const tabs = needsTabs && row.tabs.length === 0 ? [makeTab()] : row.tabs;
                const activeTabId = needsTabs
                  ? (tabs.find((t) => t.id === row.activeTabId) ? row.activeTabId : tabs[0]?.id ?? null)
                  : null;
                return { ...row, type, tabs, activeTabId };
              }),
            }
      )
    );
  }

  function resizeColumn(colId, nextColId, pixelDelta, containerWidth) {
    if (containerWidth <= 0) return;
    update((cols) => {
      const ci = cols.findIndex((c) => c.id === colId);
      const ni = cols.findIndex((c) => c.id === nextColId);
      if (ci === -1 || ni === -1) return cols;
      const totalFlex = cols.reduce((s, c) => s + c.flex, 0);
      const deltaFlex = (pixelDelta / containerWidth) * totalFlex;
      const MIN = 0.15;
      const aFlex = cols[ci].flex + deltaFlex;
      const bFlex = cols[ni].flex - deltaFlex;
      if (aFlex < MIN || bFlex < MIN) return cols;
      return cols.map((c) => {
        if (c.id === colId) return { ...c, flex: aFlex };
        if (c.id === nextColId) return { ...c, flex: bFlex };
        return c;
      });
    });
  }

  function resizeRow(colId, rowId, nextRowId, pixelDelta, containerHeight) {
    if (containerHeight <= 0) return;
    update((cols) =>
      cols.map((col) => {
        if (col.id !== colId) return col;
        const ri = col.rows.findIndex((r) => r.id === rowId);
        const ni = col.rows.findIndex((r) => r.id === nextRowId);
        if (ri === -1 || ni === -1) return col;
        const totalFlex = col.rows.reduce((s, r) => s + r.flex, 0);
        const deltaFlex = (pixelDelta / containerHeight) * totalFlex;
        const MIN = 0.1;
        const aFlex = col.rows[ri].flex + deltaFlex;
        const bFlex = col.rows[ni].flex - deltaFlex;
        if (aFlex < MIN || bFlex < MIN) return col;
        const rows = col.rows.map((r) => {
          if (r.id === rowId) return { ...r, flex: aFlex };
          if (r.id === nextRowId) return { ...r, flex: bFlex };
          return r;
        });
        return { ...col, rows };
      })
    );
  }

  function addTab(colId, rowId, module, title) {
    let newId = null;
    update((cols) =>
      cols.map((col) =>
        col.id !== colId
          ? col
          : {
              ...col,
              rows: col.rows.map((row) => {
                if (row.id !== rowId) return row;
                const tab = makeTab(module, title);
                newId = tab.id;
                return { ...row, tabs: [...row.tabs, tab], activeTabId: tab.id };
              }),
            }
      )
    );
    return newId;
  }

  function removeTab(colId, rowId, tabId) {
    update((cols) =>
      cols.map((col) =>
        col.id !== colId
          ? col
          : {
              ...col,
              rows: col.rows.map((row) => {
                if (row.id !== rowId) return row;
                const tabs = row.tabs.filter((t) => t.id !== tabId);
                const activeTabId =
                  row.activeTabId === tabId ? (tabs[0]?.id ?? null) : row.activeTabId;
                return { ...row, tabs, activeTabId };
              }),
            }
      )
    );
  }

  function setActiveTab(colId, rowId, tabId) {
    update((cols) =>
      cols.map((col) =>
        col.id !== colId
          ? col
          : {
              ...col,
              rows: col.rows.map((row) =>
                row.id === rowId ? { ...row, activeTabId: tabId } : row
              ),
            }
      )
    );
  }

  function movePane(fromColId, fromRowId, toColId, toRowId, position) {
    update((cols) => {
      const fromCol = cols.find((c) => c.id === fromColId);
      if (!fromCol) return cols;
      const fromRow = fromCol.rows.find((r) => r.id === fromRowId);
      if (!fromRow) return cols;

      // No-op: dropping before/after itself
      if ((position === 'before' || position === 'after') && fromColId === toColId && fromRowId === toRowId) {
        return cols;
      }

      // Remove from source column
      const afterRemoval = cols.map((col) =>
        col.id !== fromColId ? col : { ...col, rows: col.rows.filter((r) => r.id !== fromRowId) }
      );

      // Drop empty columns, but never go below 1
      const nonEmpty = afterRemoval.filter((c) => c.rows.length > 0);
      const pruned = nonEmpty.length > 0 ? nonEmpty : [afterRemoval[0]];

      if (position === 'new-col-before' || position === 'new-col-after') {
        const targetIdx = pruned.findIndex((c) => c.id === toColId);
        const newCol = { id: uid(), flex: 0.65, rows: [{ ...fromRow, flex: 1 }] };
        if (targetIdx === -1) return [...pruned, newCol];
        const result = [...pruned];
        result.splice(position === 'new-col-before' ? targetIdx : targetIdx + 1, 0, newCol);
        return result;
      }

      return pruned.map((col) => {
        if (col.id !== toColId) return col;
        const targetIdx = col.rows.findIndex((r) => r.id === toRowId);
        const insertIdx =
          targetIdx === -1
            ? col.rows.length
            : position === 'before'
            ? targetIdx
            : targetIdx + 1;
        const newRows = [...col.rows];
        newRows.splice(insertIdx, 0, fromRow);
        return { ...col, rows: newRows };
      });
    });
  }

  function swapTabModule(colId, rowId, tabId, module, title) {
    update((cols) =>
      cols.map((col) =>
        col.id !== colId
          ? col
          : {
              ...col,
              rows: col.rows.map((row) =>
                row.id !== rowId
                  ? row
                  : {
                      ...row,
                      tabs: row.tabs.map((t) =>
                        t.id === tabId ? { ...t, module, title } : t
                      ),
                    }
              ),
            }
      )
    );
  }

  return {
    columns,
    addColumn,
    removePane,
    splitPane,
    setPaneType,
    resizeColumn,
    resizeRow,
    addTab,
    removeTab,
    setActiveTab,
    swapTabModule,
    movePane,
  };
}
