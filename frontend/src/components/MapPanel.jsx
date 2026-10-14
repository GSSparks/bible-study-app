import { ArrowUpRight, Map, X } from 'lucide-react';
import BibleMapView from './BibleMapView.jsx';

export default function MapPanel({ open, onClose, pendingMapContext, onOpenInCell, onOpenInCodex, onOpenInMapView }) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel — always mounted so slide animation works, but BibleMapView
          is conditionally rendered to avoid Leaflet's 0×0 NaN issue on hidden divs. */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-rule bg-ink shadow-2xl transition-transform duration-300 ease-in-out sm:w-[780px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-rule bg-panel px-3 py-2">
          <Map size={15} className="shrink-0 text-brass" />
          <span className="flex-1 font-ui text-sm text-parchment">Scripture Map</span>
          <button
            onClick={() => { onOpenInMapView?.(); onClose(); }}
            title="Open full Map page"
            className="shrink-0 rounded p-1 text-muted hover:text-brass"
          >
            <ArrowUpRight size={15} />
          </button>
          <button
            onClick={onClose}
            title="Close (Ctrl+M)"
            className="shrink-0 rounded p-1 text-muted hover:text-parchment"
          >
            <X size={16} />
          </button>
        </div>

        {/* Map — only mounted while the panel is open */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {open && (
            <BibleMapView
              pendingMapContext={pendingMapContext}
              onOpenInCell={onOpenInCell}
              onOpenInCodex={onOpenInCodex}
            />
          )}
        </div>
      </div>
    </>
  );
}
