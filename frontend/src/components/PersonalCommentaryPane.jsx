import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Upload, Download, Pencil } from 'lucide-react';
import { api } from '../api/client.js';

export default function PersonalCommentaryPane({ reference, onNavigate }) {
  const [entry, setEntry] = useState(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editorTab, setEditorTab] = useState('write');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [allEntries, setAllEntries] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [exporting, setExporting] = useState(false);

  const refreshAll = useCallback(() => {
    setLoadingAll(true);
    api.listAllCommentaryEntries()
      .then(setAllEntries)
      .catch(() => {})
      .finally(() => setLoadingAll(false));
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    setLoadingEntry(true);
    setEditing(false);
    setSaveError(null);
    api.getCommentaryEntry(reference)
      .then((e) => {
        if (cancelled) return;
        setEntry(e);
        setTitle(e ? e.title : `Note on ${reference}`);
        setBody(e ? (e.bodyMd || '') : '');
      })
      .catch(() => { if (!cancelled) setEntry(null); })
      .finally(() => { if (!cancelled) setLoadingEntry(false); });
    return () => { cancelled = true; };
  }, [reference]);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.saveCommentaryNote({
        reference,
        title: title.trim() || `Note on ${reference}`,
        bodyMd: body,
      });
      const updated = await api.getCommentaryEntry(reference);
      setEntry(updated);
      if (updated) { setTitle(updated.title); setBody(updated.bodyMd || ''); }
      setEditing(false);
      refreshAll();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setEditorTab('write');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError(null);
    if (entry) { setTitle(entry.title); setBody(entry.bodyMd || ''); }
    else { setTitle(`Note on ${reference}`); setBody(''); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await api.exportCommentary();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-commentary.md';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setExporting(false); }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const { imported } = await api.importCommentary(file);
      setImportMsg(`Imported ${imported} entr${imported === 1 ? 'y' : 'ies'}.`);
      refreshAll();
      if (reference) {
        const updated = await api.getCommentaryEntry(reference);
        setEntry(updated);
        if (updated) { setTitle(updated.title); setBody(updated.bodyMd || ''); }
        else { setTitle(`Note on ${reference}`); setBody(''); }
      }
    } catch (err) {
      setImportMsg(`Error: ${err.message}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page font-sans text-sm text-pageText">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-pageBorder px-3 py-2">
        <span className="text-xs font-medium text-pageText">My Commentary</span>
        {allEntries.length > 0 && (
          <span className="text-xs text-pageMuted">
            {allEntries.length} {allEntries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <label
            className={`cursor-pointer rounded p-1 transition-colors hover:text-pageText ${importing ? 'text-pageAccent' : 'text-pageMuted'}`}
            title="Import .md file"
          >
            <Upload size={14} strokeWidth={2} />
            <input type="file" accept=".md" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button
            onClick={handleExport}
            disabled={exporting || allEntries.length === 0}
            title="Export as Markdown"
            className="rounded p-1 text-pageMuted transition-colors hover:text-pageText disabled:opacity-40"
          >
            <Download size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="shrink-0 border-b border-pageBorder px-3 py-1.5 text-xs text-pageAccent">
          {importMsg}
        </div>
      )}

      {/* ── Current passage ──────────────────────────────────────── */}
      <div className="shrink-0 border-b border-pageBorder">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="font-mono text-xs text-pageAccent">{reference || '—'}</span>
          {!editing && (
            <button
              onClick={startEdit}
              title={entry ? 'Edit' : 'Write'}
              className="ml-auto rounded p-1 text-pageMuted transition-colors hover:text-pageText"
            >
              <Pencil size={13} strokeWidth={2} />
            </button>
          )}
        </div>

        {loadingEntry ? (
          <p className="px-3 pb-3 text-xs text-pageMuted">Loading…</p>
        ) : editing ? (
          <div className="px-3 pb-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-2 w-full bg-transparent text-sm font-medium text-pageText placeholder:text-pageMuted focus:outline-none"
              placeholder="Title…"
            />
            <div className="mb-2 flex border-b border-pageBorder">
              {['write', 'preview'].map((t) => (
                <button
                  key={t}
                  onClick={() => setEditorTab(t)}
                  className={`px-3 py-1 text-xs capitalize ${
                    editorTab === t
                      ? 'border-b-2 border-pageAccent text-pageText'
                      : 'text-pageMuted hover:text-pageText'
                  }`}
                >
                  {t}
                </button>
              ))}
              <span className="ml-auto py-1 pr-1 text-[10px] text-pageMuted/60">Markdown · Cmd+Enter to save</span>
            </div>
            {editorTab === 'write' ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save(); }
                }}
                placeholder="Write your commentary… Markdown supported."
                rows={7}
                autoFocus
                className="w-full resize-none bg-transparent font-mono text-sm text-pageText placeholder:text-pageMuted/50 focus:outline-none"
              />
            ) : (
              <div className="markdown-body markdown-body-page max-h-44 overflow-y-auto text-sm text-pageText">
                {body.trim()
                  ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                  : <p className="italic text-pageMuted/60">Nothing to preview.</p>
                }
              </div>
            )}
            {saveError && <p className="mt-1 text-xs text-red-400">{saveError}</p>}
            <div className="mt-2 flex gap-2">
              <button
                onClick={save}
                disabled={saving || !body.trim()}
                className="rounded bg-pageAccent px-3 py-1 text-xs font-medium text-page hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'saving…' : entry ? 'Update' : 'Save'}
              </button>
              <button onClick={cancelEdit} className="text-xs text-pageMuted hover:text-pageText">
                cancel
              </button>
            </div>
          </div>
        ) : entry ? (
          <div className="markdown-body markdown-body-page max-h-52 overflow-y-auto px-3 pb-3 text-sm text-pageText">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.bodyMd || ''}</ReactMarkdown>
          </div>
        ) : reference ? (
          <p className="px-3 pb-3 text-xs text-pageMuted">No entry for this passage yet.</p>
        ) : null}
      </div>

      {/* ── All entries ──────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <p className="mb-2 text-[10px] uppercase tracking-wide text-pageMuted">All entries</p>
          {loadingAll ? (
            <p className="text-xs text-pageMuted">Loading…</p>
          ) : allEntries.length === 0 ? (
            <p className="text-xs text-pageMuted">
              No entries yet. Select a passage and click Write above.
            </p>
          ) : (
            <div className="space-y-px">
              {allEntries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onNavigate?.(e.reference)}
                  className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-pageBorder/40 ${
                    e.reference === reference
                      ? 'bg-pageBorder/60 text-pageText'
                      : 'text-pageMuted hover:text-pageText'
                  }`}
                >
                  <span className="font-mono text-[10px] text-pageAccent">{e.reference}</span>
                  {e.title && e.title !== `Note on ${e.reference}` && (
                    <span className="ml-2 text-pageText/70">{e.title}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
