import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function ReadingPlanView({ isLoggedIn, onOpenInBible }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPlanId, setOpenPlanId] = useState(null);
  const [fullPlan, setFullPlan] = useState(null);
  const [progress, setProgress] = useState({}); // { [planId]: Set<dayNumber> }
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    api.listReadingPlans().then(setPlans).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function openPlan(id) {
    setOpenPlanId(id);
    setLoadingPlan(true);
    try {
      const [plan, prog] = await Promise.all([
        api.getReadingPlan(id),
        isLoggedIn ? api.getReadingPlanProgress(id).then((r) => r.completedDays || []) : Promise.resolve([]),
      ]);
      setFullPlan(plan);
      setProgress((prev) => ({ ...prev, [id]: new Set(prog) }));
    } catch {
      // handled below
    } finally {
      setLoadingPlan(false);
    }
  }

  async function toggleDay(planId, dayNumber) {
    if (!isLoggedIn) return;
    const completed = progress[planId]?.has(dayNumber);
    const next = new Set(progress[planId] || []);
    if (completed) {
      next.delete(dayNumber);
      await api.unmarkReadingPlanDay(planId, dayNumber).catch(() => {});
    } else {
      next.add(dayNumber);
      await api.markReadingPlanDay(planId, dayNumber).catch(() => {});
    }
    setProgress((prev) => ({ ...prev, [planId]: next }));
  }

  if (openPlanId && fullPlan) {
    const dayCount = Array.isArray(fullPlan.schedule) ? fullPlan.schedule.length : 0;
    const completedSet = progress[openPlanId] || new Set();
    const completedCount = completedSet.size;

    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Plan header */}
        <div className="shrink-0 border-b border-rule bg-panel px-6 py-4">
          <button
            onClick={() => { setOpenPlanId(null); setFullPlan(null); }}
            className="mb-2 text-xs text-muted hover:text-parchment"
          >
            ← All Plans
          </button>
          <h2 className="font-display text-xl text-parchment">{fullPlan.name}</h2>
          {fullPlan.description && (
            <p className="mt-1 text-sm text-muted">{fullPlan.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule">
              <div
                className="h-full rounded-full bg-brass transition-all"
                style={{ width: dayCount > 0 ? `${(completedCount / dayCount) * 100}%` : '0%' }}
              />
            </div>
            <span className="shrink-0 font-mono text-xs text-muted">
              {completedCount} / {dayCount} days
            </span>
          </div>
        </div>

        {/* Day list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {Array.isArray(fullPlan.schedule) &&
            fullPlan.schedule.map((day) => {
              const done = completedSet.has(day.day);
              return (
                <div
                  key={day.day}
                  className={`mb-2 flex items-start gap-3 rounded-md border p-3 ${
                    done ? 'border-rule/50 bg-panel/30' : 'border-rule bg-panel'
                  }`}
                >
                  {isLoggedIn && (
                    <button
                      onClick={() => toggleDay(openPlanId, day.day)}
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
                        done
                          ? 'border-brass bg-brass text-ink'
                          : 'border-rule text-transparent hover:border-brass'
                      }`}
                      title={done ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {done ? '✓' : ''}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="mr-2 font-mono text-xs text-muted">Day {day.day}</span>
                    <span className={`text-sm ${done ? 'text-muted line-through' : 'text-parchment'}`}>
                      {day.label}
                    </span>
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
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-rule bg-panel px-6 py-4">
        <h2 className="font-display text-xl text-parchment">Reading Plans</h2>
        <p className="mt-1 text-sm text-muted">Structured plans to guide your daily Bible reading.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {loading && <p className="text-sm text-muted">Loading…</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const prog = progress[plan.id];
            const pct = prog && plan.dayCount > 0 ? (prog.size / plan.dayCount) * 100 : null;
            return (
              <button
                key={plan.id}
                onClick={() => openPlan(plan.id)}
                className="flex flex-col gap-2 rounded-md border border-rule bg-panel p-4 text-left transition-colors hover:border-brass"
              >
                <div>
                  <h3 className="font-display text-base text-parchment">{plan.name}</h3>
                  {plan.description && (
                    <p className="mt-1 text-xs text-muted">{plan.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{plan.dayCount} days</span>
                  {pct !== null && (
                    <>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-rule">
                        <div
                          className="h-full rounded-full bg-brass"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-muted">{Math.round(pct)}%</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {loadingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60">
            <p className="text-sm text-parchment">Loading plan…</p>
          </div>
        )}
      </div>
    </div>
  );
}
