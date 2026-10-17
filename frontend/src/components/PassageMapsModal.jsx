import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { api } from '../api/client.js';

function getShortTitle(title) {
  if (title.startsWith('SRV ')) return title;
  const colon = title.indexOf(':');
  return colon > 0 ? title.slice(colon + 2) : title;
}

export default function PassageMapsModal({ reference, onClose }) {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setLoading(true);
    setMaps([]);
    api.getMapsForReference(reference)
      .then(setMaps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reference]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <>
      {/* Backdrop — only visible on large screens */}
      <div
        className="fixed inset-0 z-[200] hidden bg-black/70 lg:block"
        onClick={onClose}
      />

      {/* Modal — fullscreen on mobile, centered card on desktop */}
      <div className="fixed inset-0 z-[201] flex flex-col bg-page lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[80vh] lg:w-[580px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:overflow-hidden lg:rounded-xl lg:shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-pageBorder px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-pageMuted">Bible Maps</p>
            <p className="truncate font-display text-base text-pageText">{reference}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-pageMuted hover:bg-pageBorder/40 hover:text-pageText"
          >
            <X size={18} />
          </button>
        </div>

        {/* Map grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="text-sm text-pageMuted">Loading maps…</p>
          )}
          {!loading && maps.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="font-display text-pageText">No maps for this passage</p>
              <p className="text-sm text-pageMuted">Try navigating to a chapter with mapped events.</p>
            </div>
          )}
          {maps.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {maps.map((map) => (
                <button
                  key={map.id}
                  onClick={() => setLightbox(map)}
                  className="group overflow-hidden rounded-lg border border-pageBorder bg-white/5 text-left transition-colors hover:border-brass/60"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-black/20">
                    <img
                      src={map.imageUrl}
                      alt={map.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium leading-snug text-pageText group-hover:text-brass">
                      {getShortTitle(map.title)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox — sits above the modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[202] flex flex-col bg-black/95 lg:items-center lg:justify-center lg:bg-black/85 lg:p-6"
          onClick={() => setLightbox(null)}
        >
          <div
            className="flex h-full w-full flex-col overflow-hidden lg:h-auto lg:max-h-[90vh] lg:max-w-3xl lg:rounded-xl lg:bg-page lg:shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center border-b border-pageBorder/40 px-4 py-3 lg:border-pageBorder">
              <button
                onClick={() => setLightbox(null)}
                className="mr-3 flex items-center gap-1.5 text-sm text-pageMuted/70 hover:text-pageMuted lg:hidden"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <p className="min-w-0 flex-1 truncate text-sm text-white/80 lg:text-pageText">
                {getShortTitle(lightbox.title)}
              </p>
              <button
                onClick={() => setLightbox(null)}
                className="hidden rounded p-1 text-pageMuted hover:text-pageText lg:block"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-2 lg:bg-black/20">
              <img
                src={lightbox.imageUrl}
                alt={lightbox.title}
                className="max-h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
