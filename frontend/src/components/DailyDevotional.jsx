import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { api } from '../api/client.js';

const TEXT_PREVIEW = 380;

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export default function DailyDevotional({ isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  function load() {
    setLoading(true);
    api.getTodaysDevotional()
      .then((d) => { setData(d); setActiveIdx(0); setExpanded(false); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) {
    return <div className="mb-4 h-28 animate-pulse rounded-xl border border-rule bg-panel" />;
  }

  if (!data?.available) {
    if (!isAdmin) return null;
    return (
      <div className="mb-4 rounded-xl border border-brass/20 bg-panel px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-brass">Daily Devotional</p>
        <p className="mt-1 text-sm text-muted">
          No devotional module installed.{' '}
          <span className="text-parchment/60">Install a <em>Daily</em>-type SWORD module (e.g. Spurgeon's Morning &amp; Evening) from the Modules panel to enable this.</span>
        </p>
      </div>
    );
  }

  const entry = data.entries[activeIdx];
  const hasMultiple = data.entries.length > 1;
  const text = entry?.text ?? '';
  const title = entry?.titles?.[0] ?? null;
  const isLong = text.length > TEXT_PREVIEW;
  const displayText = isLong && !expanded ? text.slice(0, TEXT_PREVIEW).trimEnd() + '…' : text;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-brass/20 bg-panel">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-rule/40 bg-brass/5 px-4 py-2.5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brass">Daily Devotional</p>
          <p className="text-[11px] text-muted">{DATE_FORMAT.format(new Date())}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasMultiple && (
            <div className="flex overflow-hidden rounded border border-rule text-xs">
              {data.entries.map((e, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveIdx(i); setExpanded(false); }}
                  className={`px-2.5 py-1 transition-colors ${activeIdx === i ? 'bg-brass/20 text-brass' : 'text-muted hover:text-parchment'}`}
                >
                  {e.label ?? `Entry ${i + 1}`}
                </button>
              ))}
            </div>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              title="Devotional settings"
              className="text-muted/50 hover:text-parchment"
            >
              <Settings2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {title && (
          <p className="mb-2 font-display text-base leading-snug text-parchment">{title}</p>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-parchment/85">{displayText}</p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-brass hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        <p className="mt-3 text-[10px] uppercase tracking-wider text-muted/40">{data.moduleCode}</p>
      </div>

      {showSettings && (
        <DevotionalSettingsModal
          modules={data.modules}
          currentModule={data.moduleCode}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); load(); }}
        />
      )}
    </div>
  );
}

function DevotionalSettingsModal({ modules, currentModule, onClose, onSaved }) {
  const [selected, setSelected] = useState(currentModule);
  const [allModules, setAllModules] = useState(modules ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listDevotionalModules().then(setAllModules).catch(() => {});
  }, []);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await api.setDevotionalModule(selected);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6 text-parchment shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Devotional Settings</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-parchment">close</button>
        </div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-muted">Active Module</label>
        {allModules.length === 0 ? (
          <p className="text-sm text-muted">No devotional modules installed. Install a <em>Daily</em>-type SWORD module first.</p>
        ) : (
          <div className="space-y-1.5">
            {allModules.map((m) => (
              <button
                key={m.name}
                onClick={() => setSelected(m.name)}
                className={`flex w-full items-start gap-2 rounded border px-3 py-2 text-left text-sm transition-colors ${
                  selected === m.name ? 'border-brass bg-brass/10 text-parchment' : 'border-rule text-muted hover:border-brass/50 hover:text-parchment'
                }`}
              >
                <div>
                  <span className="font-medium">{m.name}</span>
                  {m.description && <span className="ml-2 text-xs text-muted">{m.description}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {allModules.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving || selected === currentModule}
            className="mt-4 w-full rounded bg-brass/90 px-3 py-2 text-sm font-medium text-ink hover:bg-brass disabled:opacity-50"
          >
            {saving ? 'saving…' : 'save'}
          </button>
        )}
      </div>
    </div>
  );
}
