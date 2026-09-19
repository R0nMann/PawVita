import { useState, useEffect } from 'react';
import { mapMarkers, DISEASES, SPECIES } from '../../data/aiPreview';

// Leaflet map rendered as an interactive SVG simulation for demo
// (Actual Leaflet integration requires DOM manipulation outside React's flow)

const INDIA_BOUNDS = { minLat: 8, maxLat: 37, minLng: 68, maxLng: 97 };

function latLngToPercent(lat: number, lng: number) {
  const x = ((lng - INDIA_BOUNDS.minLng) / (INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng)) * 100;
  const y = ((INDIA_BOUNDS.maxLat - lat) / (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat)) * 100;
  return { x, y };
}

const severityConfig = {
  high: { fill: '#E63946', ring: 'rgba(230,57,70,0.2)', size: 18, pulse: true },
  medium: { fill: '#FFD166', ring: 'rgba(255,209,102,0.2)', size: 14, pulse: false },
  low: { fill: '#40916C', ring: 'rgba(64,145,108,0.2)', size: 10, pulse: false },
};

export default function RiskMap() {
  const [selectedDisease, setSelectedDisease] = useState('All');
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [hoveredMarker, setHoveredMarker] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1500);
    return () => clearInterval(interval);
  }, []);

  const filtered = mapMarkers.filter(m =>
    (selectedDisease === 'All' || m.disease === selectedDisease || m.disease.includes(selectedDisease.slice(0, 3))) &&
    (selectedSpecies === 'All')
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600 font-display">Disease:</span>
          <select
            value={selectedDisease}
            onChange={e => setSelectedDisease(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
          >
            <option>All</option>
            <option>FMD</option>
            <option>LSD</option>
            <option>HS</option>
            {DISEASES.slice(0, 4).map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600 font-display">Species:</span>
          <select
            value={selectedSpecies}
            onChange={e => setSelectedSpecies(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
          >
            <option>All</option>
            {SPECIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-red-500 rounded-full"></span> High Risk</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-yellow-400 rounded-full"></span> Medium</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Low</span>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 bg-[#1a3a2a] relative overflow-hidden">
          {/* India outline SVG */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="xMidYMid meet">
            <rect width="100" height="100" fill="none" />
            {/* Simplified India boundary suggestion */}
            <path d="M 20 15 L 75 10 L 85 25 L 82 45 L 70 65 L 60 75 L 50 90 L 42 80 L 35 65 L 25 50 L 18 35 Z" fill="#2D6A4F" stroke="#40916C" strokeWidth="0.5" />
          </svg>

          {/* Grid lines */}
          <div className="absolute inset-0 opacity-10">
            {[20, 40, 60, 80].map(p => (
              <div key={p}>
                <div className="absolute border-t border-white/30" style={{ top: `${p}%`, left: 0, right: 0 }} />
                <div className="absolute border-l border-white/30" style={{ left: `${p}%`, top: 0, bottom: 0 }} />
              </div>
            ))}
          </div>

          {/* Map markers */}
          {filtered.map(m => {
            const pos = latLngToPercent(m.lat, m.lng);
            const cfg = severityConfig[m.severity as keyof typeof severityConfig];
            const isHovered = hoveredMarker === m.id;
            const isPulsing = cfg.pulse && tick % 2 === 0;

            return (
              <div
                key={m.id}
                className="absolute cursor-pointer"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                onMouseEnter={() => setHoveredMarker(m.id)}
                onMouseLeave={() => setHoveredMarker(null)}
              >
                {/* Pulse ring */}
                {cfg.pulse && (
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: cfg.size * 3,
                      height: cfg.size * 3,
                      background: cfg.ring,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      animation: isPulsing ? 'pulse-ring 1.5s ease-out infinite' : 'none',
                    }}
                  />
                )}
                {/* Marker dot */}
                <div
                  className="rounded-full border-2 border-white shadow-lg transition-transform"
                  style={{
                    width: cfg.size,
                    height: cfg.size,
                    background: cfg.fill,
                    transform: isHovered ? 'scale(1.5)' : 'scale(1)',
                  }}
                />
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute z-10 bg-white rounded-xl p-3 shadow-xl text-left whitespace-nowrap"
                    style={{ bottom: '120%', left: '50%', transform: 'translateX(-50%)' }}>
                    <p className="font-bold text-gray-800 font-display text-sm">{m.disease}</p>
                    <p className="text-gray-500 text-xs">{m.district}</p>
                    <p className="text-gray-600 text-xs font-semibold mt-1">{m.cases} active cases</p>
                    <div className={`mt-1 text-xs px-2 py-0.5 rounded-full text-center font-medium ${
                      m.severity === 'high' ? 'severity-high' : m.severity === 'medium' ? 'severity-medium' : 'severity-low'
                    }`}>{m.severity} risk</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Map label */}
          <div className="absolute bottom-4 left-4 glass-dark rounded-xl px-4 py-2">
            <p className="text-white/80 text-xs font-semibold">India Disease Risk Map</p>
            <p className="text-white/50 text-xs">{filtered.length} active clusters shown</p>
          </div>

          {/* Zoom controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-1">
            <button className="w-8 h-8 bg-white rounded-lg shadow text-gray-600 font-bold hover:bg-gray-50 transition-colors">+</button>
            <button className="w-8 h-8 bg-white rounded-lg shadow text-gray-600 font-bold hover:bg-gray-50 transition-colors">−</button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 bg-white border-l border-gray-100 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold font-display text-[#1B4332]">Cluster List</h3>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} clusters active</p>
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.map(m => (
              <div
                key={m.id}
                className="p-4 hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredMarker(m.id)}
                onMouseLeave={() => setHoveredMarker(null)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: severityConfig[m.severity as keyof typeof severityConfig].fill }} />
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{m.disease}</p>
                    <p className="text-gray-500 text-xs">{m.district}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{m.cases} cases</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        m.severity === 'high' ? 'severity-high' : m.severity === 'medium' ? 'severity-medium' : 'severity-low'
                      }`}>{m.severity}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
