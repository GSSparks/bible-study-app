import { useEffect, useState } from 'react';
import { BookMarked, Check, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { api } from '../api/client.js';

function parseScheduleText(text) {
  return text
    .split('\n')
    .map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const pipeIdx = trimmed.indexOf('|');
      if (pipeIdx === -1) {
        return { day: i + 1, label: trimmed, passages: [] };
      }
      const label = trimmed.slice(0, pipeIdx).trim();
      const passages = trimmed
        .slice(pipeIdx + 1)
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      return { day: i + 1, label, passages };
    })
    .filter(Boolean)
    .map((entry, idx) => ({ ...entry, day: idx + 1 }));
}

function scheduleToText(schedule) {
  if (!Array.isArray(schedule)) return '';
  return schedule
    .map((d) =>
      d.passages && d.passages.length > 0
        ? `${d.label} | ${d.passages.join(', ')}`
        : d.label
    )
    .join('\n');
}

export default function CursusView({ isLoggedIn, isAdmin, onOpenInBible }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [fullPlan, setFullPlan] = useState(null);
  const [progress, setProgress] = useState(new Map()); // planId → Set<dayNumber>
  const [planLoading, setPlanLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | planId
  const [editForm, setEditForm] = useState({ name: '', description: '', schedule: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setFullPlan(null);
      return;
    }
    setPlanLoading(true);
    Promise.all([
      api.getReadingPlan(selectedId),
      isLoggedIn
        ? api.getReadingPlanProgress(selectedId).then((r) => r.completedDays || [])
        : Promise.resolve([]),
    ])
      .then(([plan, completed]) => {
        setFullPlan(plan);
        setProgress((prev) => {
          const next = new Map(prev);
          next.set(selectedId, new Set(completed));
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, [selectedId, isLoggedIn]);

  async function loadPlans() {
    setLoading(true);
    try {
      setPlans(await api.listReadingPlans());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function toggleDay(planId, dayNumber) {
    if (!isLoggedIn) return;
    const set = progress.get(planId) || new Set();
    const isDone = set.has(dayNumber);
    const next = new Set(set);
    if (isDone) {
      next.delete(dayNumber);
      api.unmarkReadingPlanDay(planId, dayNumber).catch(() => {});
    } else {
      next.add(dayNumber);
      api.markReadingPlanDay(planId, dayNumber).catch(() => {});
    }
    setProgress((prev) => {
      const m = new Map(prev);
      m.set(planId, next);
      return m;
    });
  }

  async function handleReset() {
    if (!selectedId || !isLoggedIn) return;
    try {
      await api.resetReadingPlanProgress(selectedId);
      setProgress((prev) => {
        const m = new Map(prev);
        m.set(selectedId, new Set());
        return m;
      });
    } catch {
      // ignore
    }
  }

  function startNew() {
    setEditing('new');
    setEditForm({ name: '', description: '', schedule: '' });
  }

  function startEdit() {
    if (!fullPlan) return;
    setEditing(selectedId);
    setEditForm({
      name: fullPlan.name,
      description: fullPlan.description || '',
      schedule: scheduleToText(fullPlan.schedule),
    });
  }

  async function handleSave() {
    const schedule = parseScheduleText(editForm.schedule);
    if (!editForm.name.trim() || schedule.length === 0) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await api.createReadingPlan({
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
          schedule,
        });
        await loadPlans();
        setSelectedId(created.id);
      } else {
        await api.updateReadingPlan(editing, {
          name: editForm.name.trim(),
          description: editForm.description.trim() || undefined,
          schedule,
        });
        await loadPlans();
        // Reload the full plan since schedule changed
        const updated = await api.getReadingPlan(editing);
        setFullPlan(updated);
      }
      setEditing(null);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteReadingPlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
      setConfirmDeleteId(null);
    } catch {
      // ignore
    }
  }

  const completedSet = selectedId ? (progress.get(selectedId) || new Set()) : new Set();
  const completedCount = completedSet.size;
  const dayCount = fullPlan && Array.isArray(fullPlan.schedule) ? fullPlan.schedule.length : 0;

  // Find the first incomplete day number for the "Up Next" badge
  let upNextDay = null;
  if (fullPlan && Array.isArray(fullPlan.schedule)) {
    const firstIncomplete = fullPlan.schedule.find((d) => !completedSet.has(d.day));
    if (firstIncomplete) upNextDay = firstIncomplete.day;
  }

  const showEditor = editing !== null;
  const showDetail = !showEditor && selectedId && fullPlan;
  const showEmpty = !showEditor && (!selectedId || planLoading);

  return (
    <div className="flex h-full min-h-0">
      {/* ── Sidebar ── */}
      <div className="flex w-64 shrink-0 flex-col border-r border-rule bg-panel">
        {/* Header */}
        <div className="shrink-0 border-b border-rule px-4 py-3">
          <div className="flex items-center gap-2">
            <BookMarked size={16} className="shrink-0 text-brass" />
            <h1 className="font-display flex-1 text-base font-semibold text-parchment">Cursus</h1>
            {isAdmin && (
              <button
                onClick={startNew}
                className="flex items-center gap-1 rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
              >
                <Plus size={11} />
                New
              </button>
            )}
          </div>
          <p className="mt-0.5 font-ui text-[10px] uppercase tracking-widest text-muted">Daily Reading Plans</p>
        </div>

        {/* Plan list */}
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {loading ? (
            <p className="px-4 py-2 text-xs text-muted">Loading…</p>
          ) : plans.length === 0 ? (
            <p className="px-4 py-4 text-xs leading-relaxed text-muted">No reading plans yet.</p>
          ) : (
            plans.map((plan) => {
              const active = plan.id === selectedId;
              const set = progress.get(plan.id);
              const pct = set && plan.dayCount > 0 ? (set.size / plan.dayCount) * 100 : null;
              return (
                <button
                  key={plan.id}
                  onClick={() => { setSelectedId(plan.id); setEditing(null); }}
                  className={`w-full border-l-2 px-4 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-brass bg-ink/40 text-brass'
                      : 'border-transparent text-muted hover:bg-ink/30 hover:text-parchment'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <p className="flex-1 truncate text-sm leading-snug">{plan.name}</p>
                    {plan.isBuiltIn && (
                      <span className="mt-0.5 shrink-0 text-[10px] text-muted/50">Built-in</span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="mt-0.5 truncate text-[11px] text-muted/70">{plan.description}</p>
                  )}
                  {pct !== null && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-rule">
                        <div
                          className="h-full rounded-full bg-brass transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-muted/70">
                        {set.size} / {plan.dayCount}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right pane ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Empty state */}
        {showEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <BookMarked size={40} className="text-muted/25" strokeWidth={1} />
            <p className="font-display text-lg text-parchment">Select a plan</p>
            <p className="text-sm text-muted">Choose a reading plan from the sidebar to begin.</p>
          </div>
        )}

        {/* Plan detail */}
        {showDetail && (
          <>
            {/* Detail header */}
            <div className="shrink-0 border-b border-rule bg-panel px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl text-parchment">{fullPlan.name}</h2>
                  {fullPlan.description && (
                    <p className="mt-1 text-sm text-muted">{fullPlan.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                  {isLoggedIn && completedCount > 0 && (
                    <button
                      onClick={handleReset}
                      title="Reset progress"
                      className="flex items-center gap-1 rounded border border-rule px-2 py-1 text-xs text-muted hover:border-brass hover:text-parchment"
                    >
                      <RotateCcw size={11} />
                      Reset
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={startEdit}
                      title="Edit plan"
                      className="rounded border border-rule p-1.5 text-muted hover:border-brass hover:text-parchment"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {isAdmin && !fullPlan.isBuiltIn && (
                    confirmDeleteId === selectedId ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(selectedId)}
                          className="rounded border border-red-500/60 px-2 py-1 text-xs text-red-400 hover:border-red-400"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded border border-rule p-1.5 text-muted hover:text-parchment"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(selectedId)}
                        title="Delete plan"
                        className="rounded border border-rule p-1.5 text-muted hover:border-red-500/60 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule">
                  <div
                    className="h-full rounded-full bg-brass transition-all"
                    style={{ width: dayCount > 0 ? `${(completedCount / dayCount) * 100}%` : '0%' }}
                  />
                </div>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {completedCount} / {dayCount} days complete
                </span>
              </div>
            </div>

            {/* Day list */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="max-w-2xl">
              {Array.isArray(fullPlan.schedule) &&
                fullPlan.schedule.map((day) => {
                  const done = completedSet.has(day.day);
                  const isUpNext = !done && day.day === upNextDay;
                  return (
                    <div
                      key={day.day}
                      className={`mb-2 flex items-start gap-3 rounded-md border p-3 ${
                        done ? 'border-rule/50 bg-panel/30' : 'border-rule bg-panel'
                      }`}
                    >
                      <button
                        onClick={() => toggleDay(selectedId, day.day)}
                        disabled={!isLoggedIn}
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                          done
                            ? 'border-brass bg-brass text-ink'
                            : isLoggedIn
                            ? 'border-rule text-transparent hover:border-brass'
                            : 'border-rule/40 text-transparent opacity-40'
                        }`}
                        title={done ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {done && <Check size={10} strokeWidth={3} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted">Day {day.day}</span>
                          {isUpNext && (
                            <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] text-brass">
                              Up Next
                            </span>
                          )}
                        </div>
                        <p className={`text-sm ${done ? 'text-muted line-through' : 'text-parchment'}`}>
                          {day.label}
                        </p>
                        {Array.isArray(day.passages) && day.passages.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {day.passages.map((p) => (
                              <button
                                key={p}
                                onClick={() => onOpenInBible?.(p)}
                                className="rounded border border-rule px-2 py-0.5 font-mono text-xs text-verdigris hover:border-brass hover:text-brass"
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Admin editor */}
        {showEditor && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <h2 className="mb-4 font-display text-xl text-parchment">
              {editing === 'new' ? 'New Reading Plan' : 'Edit Reading Plan'}
            </h2>
            <div className="flex max-w-2xl flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Name
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
                  placeholder="Plan name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded border border-rule bg-ink/60 px-3 py-2 text-sm text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Schedule
                </label>
                <textarea
                  value={editForm.schedule}
                  onChange={(e) => setEditForm((f) => ({ ...f, schedule: e.target.value }))}
                  rows={10}
                  className="w-full rounded border border-rule bg-ink/60 px-3 py-2 font-mono text-xs text-parchment placeholder:text-muted focus:border-brass focus:outline-none"
                  placeholder="Matthew 1–3 | Matt 1, Matt 2, Matt 3"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  One day per line. Format: <span className="font-mono text-muted/80">Label | passage1, passage2</span>
                  {' — '}for example, <span className="font-mono text-muted/80">Matthew 1–3 | Matt 1, Matt 2, Matt 3</span>.
                  If no <span className="font-mono text-muted/80">|</span> is present, the line is treated as a label with no passage links.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !editForm.name.trim()}
                  className="rounded border border-brass bg-brass/10 px-4 py-1.5 text-sm text-brass hover:bg-brass/20 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="rounded border border-rule px-4 py-1.5 text-sm text-muted hover:border-brass hover:text-parchment"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
