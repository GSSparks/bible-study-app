import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client.js';

export default function AddEntryDialog({ year, month, day, layers, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [layerId, setLayerId] = useState(layers[0]?.id || '');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || !layerId) return;
    setSaving(true);
    try {
      await api.createCalendarEntry({
        layerId,
        title: title.trim(),
        description: description.trim() || null,
        year,
        month,
        day,
        reference: reference.trim() || null,
      });
      onSaved?.();
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-parchment">New Entry</h3>
          <button onClick={onClose} className="rounded p-1 text-muted hover:text-parchment">
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Birthday"
              className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Layer</label>
            <select
              value={layerId}
              onChange={(e) => setLayerId(e.target.value)}
              className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment focus:border-brass focus:outline-none"
            >
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional details"
              className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Scripture Reference (optional)</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Joshua 1:9"
              className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !layerId}
              className="rounded border border-brass bg-brass/10 px-4 py-1.5 text-sm text-brass hover:bg-brass/20 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              onClick={onClose}
              className="rounded border border-rule px-4 py-1.5 text-sm text-muted hover:border-brass hover:text-parchment"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
