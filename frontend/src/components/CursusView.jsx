import { useState } from 'react';
import { BookMarked, Calendar, Clock } from 'lucide-react';
import ReadingPlanTab from './ReadingPlanTab';
import CalendarTab from './CalendarTab';
import TimelineTab from './TimelineTab';

const TABS = [
  { id: 'reading-plan', label: 'Reading Plan', icon: BookMarked },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'timeline', label: 'Timeline', icon: Clock },
];

export default function CursusView({ isLoggedIn, isAdmin, onOpenInBible }) {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="flex h-full min-h-0 flex-col">
    {/* Tab bar */}
    <div className="flex shrink-0 border-b border-rule bg-panel">
    <div className="flex items-center gap-1 px-4 py-2">
    <h1 className="font-display mr-3 text-base font-semibold text-parchment">Cursus</h1>
    {TABS.map((tab) => {
      const Icon = tab.icon;
      const active = activeTab === tab.id;
      return (
        <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
          active
          ? 'bg-ink/60 text-brass'
          : 'bg-ink/30 text-muted hover:bg-ink/50 hover:text-parchment'
        }`}
        >
        <Icon size={14} />
        {tab.label}
        </button>
      );
    })}
    </div>
    </div>

    {/* Tab content */}
    <div className="min-h-0 flex-1 overflow-hidden">
    {activeTab === 'reading-plan' && (
      <ReadingPlanTab isLoggedIn={isLoggedIn} isAdmin={isAdmin} onOpenInBible={onOpenInBible} />
    )}
    {activeTab === 'calendar' && (
      <CalendarTab isLoggedIn={isLoggedIn} />
    )}
    {activeTab === 'timeline' && (
      <TimelineTab isLoggedIn={isLoggedIn} />
    )}
    </div>
    </div>
  );
}
