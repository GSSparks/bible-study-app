// frontend/src/components/NewLayerDialog.jsx

import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client.js';

const PRESET_COLORS = [
  '#E8A441', '#3F7168', '#8B8FA3', '#C0392B', '#2980B9',
  '#8E44AD', '#27AE60', '#D35400', '#1ABC9C', '#F39C12',
];

export default function NewLayerDialog({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [calendarSystem, setCalendarSystem] = useState('gregorian');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
    setSaving(true);
    try {
      const layer = await api.createCalendarLayer({ name: name.trim(), color, calendarSystem });
      onCreated?.(layer);
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-rule bg-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-parchment">New Layer</h3>
          <button onClick={onClose} className="rounded p-1 text-muted hover:text-parchment">
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Birthdays"
              className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-parchment' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-2 w-24 rounded border border-rule bg-ink/60 px-2 py-1 font-mono text-xs text-parchment focus:border-brass focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Calendar System</label>
            <select
              value={calendarSystem}
              onChange={(e) => setCalendarSystem(e.target.value)}
              className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment focus:border-brass focus:outline-none"
            >
              <option value="gregorian">Gregorian</option>
              <option value="hebrew">Hebrew</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="rounded border border-brass bg-brass/10 px-4 py-1.5 text-sm text-brass hover:bg-brass/20 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create'}
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
{selectedDay !== null && (
  <AddEntryDialog
  year={year}
  month={month}
  day={selectedDay}
  layers={layers.filter((l) => !l.shared || l.myShareRole === 'editor')}
  onClose={() => setSelectedDay(null)}
  onSaved={loadEntries}
  />
)}
