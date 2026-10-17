import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowUpRight, ChevronDown, ChevronRight, Layers, Map, MapPin, Navigation, SlidersHorizontal, X } from 'lucide-react';
import { TIME_PERIODS, EMPIRES, JOURNEYS, CITIES } from '../data/biblicalMapData.js';

function MapSync({ center, zoom }) {
  const map = useMap();
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (!center || Number.isNaN(center[0]) || Number.isNaN(center[1])) return;
    try {
      map.flyTo(center, zoom, { duration: 1.2 });
    } catch {
      try { map.setView(center, zoom); } catch { /* ignore */ }
    }
  }, [center, zoom]);
  return null;
}

const TILE_LAYERS = [
  {
    id: 'terrain',
    label: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 13,
  },
  {
    id: 'topo',
    label: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    maxZoom: 17,
  },
  {
    id: 'light',
    label: 'Light Gray',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 16,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    maxZoom: 17,
  },
];

const CITY_RADIUS = { major: 7, minor: 4, holy: 8, region: 0 };
const CITY_COLOR = { major: '#E8A441', minor: '#8B8B7A', holy: '#F5F4F1', region: 'transparent' };

// controlsOpen / onToggleControls: when provided by a parent (e.g. MapPanel),
// the parent owns the controls toggle state. When absent, BibleMapView manages it internally.
export default function BibleMapView({ pendingMapContext, onOpenInCell, onOpenInCodex, onClose, onOpenInMapView, controlsOpen: controlsOpenProp, onToggleControls }) {
  const [selectedPeriod, setSelectedPeriod] = useState('nt');
  const [selectedJourney, setSelectedJourney] = useState('paul-journey-1');
  const [selectedCity, setSelectedCity] = useState(null);
  const [showEmpires, setShowEmpires] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [showJourneys, setShowJourneys] = useState(true);
  const [tileLayer, setTileLayer] = useState('terrain');
  const [controlsOpenInternal, setControlsOpenInternal] = useState(false);
  const [controlsTab, setControlsTab] = useState('era');

  const controlled = controlsOpenProp !== undefined;
  const controlsOpen = controlled ? controlsOpenProp : controlsOpenInternal;
  function toggleControls() {
    if (controlled) onToggleControls?.();
    else setControlsOpenInternal((o) => !o);
  }
  const [journeyExpanded, setJourneyExpanded] = useState(true);

  const period = TIME_PERIODS.find((p) => p.id === selectedPeriod);
  const periodJourneys = JOURNEYS.filter((j) => j.period === selectedPeriod);
  const periodEmpires = EMPIRES.filter((e) => e.periods.includes(selectedPeriod));
  const periodCities = CITIES.filter((c) => c.periods.includes(selectedPeriod));
  const activeJourney = periodJourneys.find((j) => j.id === selectedJourney) ?? null;
  const activeTile = TILE_LAYERS.find((t) => t.id === tileLayer) ?? TILE_LAYERS[0];

  useEffect(() => {
    if (!pendingMapContext) return;
    if (pendingMapContext.cityId) {
      const city = CITIES.find((c) => c.id === pendingMapContext.cityId);
      if (city) {
        setSelectedPeriod(pendingMapContext.periodId ?? city.periods[0]);
        setSelectedJourney(null);
        setSelectedCity(city);
      }
    } else if (pendingMapContext.periodId) {
      setSelectedPeriod(pendingMapContext.periodId);
      if (pendingMapContext.journeyId) setSelectedJourney(pendingMapContext.journeyId);
      setSelectedCity(null);
    }
  }, [pendingMapContext?.nonce]);

  function selectPeriod(pid) {
    setSelectedPeriod(pid);
    setSelectedJourney(null);
    setSelectedCity(null);
  }

  function selectJourney(journey) {
    setSelectedJourney(journey.id === selectedJourney ? null : journey.id);
    setSelectedCity(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-ink">
      {/* Header — only shown in standalone mode (not when embedded in MapPanel) */}
      {!controlled && (
      <div className="flex shrink-0 items-center gap-2 border-b border-rule bg-panel px-3 py-2">
        <Map size={15} className="shrink-0 text-brass" />
        <span className="flex-1 font-ui text-sm text-parchment">Scripture Map</span>
        <button
          onClick={toggleControls}
          title="Toggle controls"
          className={`shrink-0 rounded p-1 transition-colors ${controlsOpen ? 'text-brass' : 'text-muted hover:text-parchment'}`}
        >
          <SlidersHorizontal size={15} />
        </button>
        {onOpenInMapView && (
          <button
            onClick={() => { onOpenInMapView(); onClose?.(); }}
            title="Open full Map page"
            className="shrink-0 rounded p-1 text-muted hover:text-brass"
          >
            <ArrowUpRight size={15} />
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            title="Close"
            className="shrink-0 rounded p-1 text-muted hover:text-parchment"
          >
            <X size={16} />
          </button>
        )}
      </div>
      )}

      {/* Map + slide-in controls overlay */}
      <div className="relative min-h-0 flex-1 overflow-hidden">

        {/* Controls pane — slides in from left, overlays the map */}
        <div
          className={`absolute inset-y-0 left-0 z-[1100] flex w-64 flex-col border-r border-rule bg-panel shadow-2xl transition-transform duration-300 ease-in-out ${
            controlsOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Controls tabs */}
          <div className="flex shrink-0 border-b border-rule">
            {[
              { id: 'era', label: 'Era' },
              { id: 'journey', label: 'Journey' },
              { id: 'layers', label: 'Layers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setControlsTab(tab.id)}
                className={`flex-1 py-2 font-ui text-xs transition-colors ${
                  controlsTab === tab.id
                    ? 'border-b-2 border-brass text-brass'
                    : 'text-muted hover:text-parchment'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Era */}
          {controlsTab === 'era' && (
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <p className="px-4 pb-1 pt-2 font-ui text-[9px] uppercase tracking-widest text-muted/70">Select Time Period</p>
              {TIME_PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPeriod(p.id)}
                  className={`w-full px-4 py-2.5 text-left transition-colors ${
                    selectedPeriod === p.id
                      ? 'border-l-2 border-brass bg-ink/50 text-brass'
                      : 'border-l-2 border-transparent text-parchment/80 hover:bg-ink/30 hover:text-parchment'
                  }`}
                >
                  <div className="font-ui text-sm font-medium">{p.label}</div>
                  <div className="font-ui text-[10px] text-muted">{p.range}</div>
                </button>
              ))}
              {period && (
                <div className="border-t border-rule px-4 py-3 mt-2">
                  <p className="font-ui text-[10px] font-semibold text-brass">{period.label}</p>
                  <p className="font-ui text-[10px] text-muted">{period.range}</p>
                  <p className="mt-1 font-ui text-[10px] leading-relaxed text-muted/80">{period.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Journey */}
          {controlsTab === 'journey' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {activeJourney && (
                <div className="shrink-0 border-b border-rule bg-ink/30 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeJourney.color }} />
                    <div>
                      <p className="font-ui text-xs font-semibold text-parchment">{activeJourney.title}</p>
                      <p className="mt-0.5 font-ui text-[10px] text-muted">{activeJourney.reference}</p>
                    </div>
                  </div>
                  <p className="mt-2 font-ui text-[11px] leading-relaxed text-muted/90">{activeJourney.summary}</p>
                  <div className="mt-3">
                    <button
                      onClick={() => setJourneyExpanded((e) => !e)}
                      className="flex items-center gap-1 font-ui text-[10px] uppercase tracking-widest text-muted hover:text-parchment"
                    >
                      {journeyExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      Waypoints ({activeJourney.waypoints.length})
                    </button>
                    {journeyExpanded && (
                      <ol className="mt-2 space-y-1.5">
                        {activeJourney.waypoints.map((wp, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-px shrink-0 font-ui text-[9px] text-muted">{i + 1}.</span>
                            <div>
                              <p className="font-ui text-[11px] font-medium text-parchment/90">{wp.label}</p>
                              <p className="font-ui text-[10px] leading-snug text-muted/80">{wp.note}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <p className="px-4 pb-1 pt-3 font-ui text-[9px] uppercase tracking-widest text-muted/70">
                  {period?.label} — {periodJourneys.length} {periodJourneys.length === 1 ? 'Journey' : 'Journeys'}
                </p>
                {periodJourneys.length === 0 && (
                  <p className="px-4 py-3 font-ui text-xs text-muted">No journeys recorded for this era.</p>
                )}
                {periodJourneys.map((journey) => (
                  <button
                    key={journey.id}
                    onClick={() => selectJourney(journey)}
                    className={`w-full px-4 py-2.5 text-left transition-colors ${
                      selectedJourney === journey.id
                        ? 'border-l-2 border-brass bg-ink/50'
                        : 'border-l-2 border-transparent hover:bg-ink/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: journey.color }} />
                      <div className="min-w-0">
                        <p className={`truncate font-ui text-xs font-medium ${selectedJourney === journey.id ? 'text-brass' : 'text-parchment/80'}`}>
                          {journey.title}
                        </p>
                        <p className="truncate font-ui text-[10px] text-muted">{journey.reference}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Layers */}
          {controlsTab === 'layers' && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-5">
              <div>
                <p className="mb-2 font-ui text-[9px] uppercase tracking-widest text-muted/70">Base Map</p>
                <div className="space-y-1">
                  {TILE_LAYERS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTileLayer(t.id)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 font-ui text-xs transition-colors ${
                        tileLayer === t.id ? 'bg-brass/20 text-brass' : 'text-muted hover:bg-ink/40 hover:text-parchment'
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full border ${tileLayer === t.id ? 'border-brass bg-brass' : 'border-muted'}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-ui text-[9px] uppercase tracking-widest text-muted/70">Overlays</p>
                <div className="space-y-1">
                  {[
                    { key: 'showEmpires', label: 'Empire Boundaries', state: showEmpires, setter: setShowEmpires },
                    { key: 'showCities', label: 'Cities & Sites', state: showCities, setter: setShowCities },
                    { key: 'showJourneys', label: 'Journey Routes', state: showJourneys, setter: setShowJourneys },
                  ].map((layer) => (
                    <button
                      key={layer.key}
                      onClick={() => layer.setter((v) => !v)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 font-ui text-xs text-muted transition-colors hover:bg-ink/40 hover:text-parchment"
                    >
                      <div className={`h-3 w-3 rounded border transition-colors ${layer.state ? 'border-brass bg-brass' : 'border-muted'}`}>
                        {layer.state && <span className="block h-full w-full text-[8px] leading-none text-ink text-center font-bold">✓</span>}
                      </div>
                      {layer.label}
                    </button>
                  ))}
                </div>
              </div>

              {showEmpires && periodEmpires.length > 0 && (
                <div>
                  <p className="mb-2 font-ui text-[9px] uppercase tracking-widest text-muted/70">Empires — {period?.label}</p>
                  <div className="space-y-1.5">
                    {periodEmpires.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-2">
                        <div
                          className="h-3 w-5 shrink-0 rounded-sm border"
                          style={{ backgroundColor: emp.color + '55', borderColor: emp.color }}
                        />
                        <span className="font-ui text-xs text-muted">{emp.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showCities && (
                <div>
                  <p className="mb-2 font-ui text-[9px] uppercase tracking-widest text-muted/70">City Types</p>
                  <div className="space-y-1.5">
                    {[
                      { color: '#E8A441', label: 'Major City', r: 7 },
                      { color: '#F5F4F1', label: 'Holy Site', r: 8 },
                      { color: '#8B8B7A', label: 'Minor City', r: 4 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <svg width="16" height="16">
                          <circle cx="8" cy="8" r={item.r * 0.7} fill={item.color + '55'} stroke={item.color} strokeWidth="1.5" />
                        </svg>
                        <span className="font-ui text-xs text-muted">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tap-outside to close controls on mobile */}
        {controlsOpen && (
          <div
            className="absolute inset-0 z-[1050]"
            style={{ left: '16rem' }}
            onClick={() => setControlsOpen(false)}
          />
        )}

        {/* ── Map ── */}
        <div className="absolute inset-0">
          {/* Selected city overlay */}
          {selectedCity && (
            <div className="absolute right-4 top-4 z-[1000] max-w-xs rounded-lg border border-rule bg-panel/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-brass" />
                    <p className="font-ui text-sm font-semibold text-parchment">{selectedCity.label}</p>
                  </div>
                  <p className="mt-1 font-ui text-[10px] uppercase tracking-widest text-muted">
                    {selectedCity.type.charAt(0).toUpperCase() + selectedCity.type.slice(1)} City
                  </p>
                </div>
                <button onClick={() => setSelectedCity(null)} className="shrink-0 text-muted hover:text-parchment">
                  <X size={14} />
                </button>
              </div>
              <p className="mt-2 font-ui text-xs leading-relaxed text-muted/90">{selectedCity.note}</p>
              <p className="mt-2 font-ui text-[10px] text-muted/60">
                Active in: {selectedCity.periods.map((pid) => TIME_PERIODS.find((p) => p.id === pid)?.label).filter(Boolean).join(', ')}
              </p>
              {onOpenInCodex && (
                <button
                  onClick={() => onOpenInCodex(selectedCity.label)}
                  className="mt-3 w-full rounded border border-rule px-2 py-1 font-ui text-[10px] text-muted transition-colors hover:border-brass hover:text-parchment"
                >
                  Search in Codex
                </button>
              )}
            </div>
          )}

          {/* Era quick-nav pills */}
          <div className="absolute bottom-4 left-4 z-[1000] flex flex-wrap gap-1">
            {TIME_PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPeriod(p.id)}
                title={`${p.label} (${p.range})`}
                className={`rounded-full px-2 py-0.5 font-ui text-[9px] uppercase tracking-wide transition-colors ${
                  selectedPeriod === p.id
                    ? 'bg-brass text-ink'
                    : 'bg-panel/80 text-muted hover:bg-panel hover:text-parchment'
                }`}
              >
                {p.range.split('–')[0].replace('c. ', '').trim()}
              </button>
            ))}
          </div>

          <MapContainer
            center={period?.center ?? [32, 37]}
            zoom={period?.zoom ?? 5}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
            attributionControl={true}
          >
            <MapSync center={period?.center ?? [32, 37]} zoom={period?.zoom ?? 5} />

            <TileLayer
              key={activeTile.id}
              url={activeTile.url}
              attribution={activeTile.attribution}
              maxZoom={activeTile.maxZoom}
            />

            {showEmpires && periodEmpires.map((emp) => (
              <Polygon
                key={emp.id}
                positions={emp.polygon}
                pathOptions={{
                  color: emp.color,
                  fillColor: emp.color,
                  fillOpacity: 0.15,
                  weight: 1.5,
                  opacity: 0.6,
                  dashArray: '6 4',
                }}
              >
                <Tooltip sticky className="leaflet-tooltip-dark">
                  <span className="font-ui text-xs font-semibold">{emp.label}</span>
                </Tooltip>
              </Polygon>
            ))}

            {showJourneys && periodJourneys.map((journey) => {
              const isActive = journey.id === selectedJourney;
              const positions = journey.waypoints.map((wp) => wp.pos);
              return (
                <Polyline
                  key={journey.id}
                  positions={positions}
                  pathOptions={{
                    color: journey.color,
                    weight: isActive ? 3.5 : 2,
                    opacity: isActive ? 0.95 : 0.35,
                    dashArray: isActive ? undefined : '8 6',
                  }}
                  eventHandlers={{
                    click: () => selectJourney(journey),
                  }}
                >
                  <Tooltip sticky>
                    <span className="font-ui text-xs">{journey.title}</span>
                  </Tooltip>
                </Polyline>
              );
            })}

            {showJourneys && activeJourney && activeJourney.waypoints.map((wp, i) => (
              <CircleMarker
                key={`${activeJourney.id}-wp-${i}`}
                center={wp.pos}
                radius={i === 0 || i === activeJourney.waypoints.length - 1 ? 8 : 5}
                pathOptions={{
                  color: activeJourney.color,
                  fillColor: i === 0 ? activeJourney.color : (i === activeJourney.waypoints.length - 1 ? '#10B981' : '#0D1B29'),
                  fillOpacity: i === 0 || i === activeJourney.waypoints.length - 1 ? 0.9 : 0.7,
                  weight: 2,
                }}
              >
                <Popup className="leaflet-popup-dark" maxWidth={280}>
                  <div className="font-ui">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeJourney.color }} />
                      <span className="text-xs font-semibold" style={{ color: '#d4cebf' }}>{wp.label}</span>
                      {i === 0 && <span className="ml-auto rounded px-1 py-px text-[9px]" style={{ background: 'rgba(232,164,65,0.2)', color: '#E8A441' }}>Start</span>}
                      {i === activeJourney.waypoints.length - 1 && <span className="ml-auto rounded px-1 py-px text-[9px]" style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>End</span>}
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: '#9ca3af' }}>{wp.note}</p>
                    <p className="mt-1.5 text-[10px]" style={{ color: '#6b7b8a' }}>{activeJourney.reference} · Stop {i + 1} of {activeJourney.waypoints.length}</p>
                    {onOpenInCell && (
                      <button
                        onClick={() => onOpenInCell(activeJourney.reference)}
                        className="mt-2 w-full rounded px-2 py-1 text-[10px] text-left transition-colors"
                        style={{ background: 'rgba(232,164,65,0.1)', color: '#E8A441', border: '1px solid rgba(232,164,65,0.25)' }}
                      >
                        Open passage in Cell ↗
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {showCities && periodCities.map((city) => {
              if (city.type === 'region') return null;
              const radius = CITY_RADIUS[city.type] ?? 5;
              const color = CITY_COLOR[city.type] ?? '#8B8B7A';
              const isSelected = selectedCity?.id === city.id;
              return (
                <CircleMarker
                  key={city.id}
                  center={city.pos}
                  radius={isSelected ? radius + 3 : radius}
                  pathOptions={{
                    color: isSelected ? '#E8A441' : color,
                    fillColor: isSelected ? '#E8A441' : color,
                    fillOpacity: 0.6,
                    weight: isSelected ? 2.5 : 1.5,
                  }}
                  eventHandlers={{
                    click: () => setSelectedCity(isSelected ? null : city),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -radius]} className="leaflet-tooltip-city">
                    <span className="font-ui text-xs">{city.label}</span>
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
