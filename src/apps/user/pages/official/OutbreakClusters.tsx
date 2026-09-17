import { outbreakClusters } from '../../data/mockData';

export default function OutbreakClusters() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-[#1B4332]">AI-Flagged Outbreak Clusters</h2>
          <p className="text-gray-500">Machine learning cluster detection — updated hourly</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs text-gray-500">Live monitoring</span>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">🤖</span>
        <div>
          <p className="font-semibold text-amber-800 font-display">AI Cluster Detection Model</p>
          <p className="text-sm text-amber-700">Clusters detected using symptom-density + time-window analysis (7-day rolling window, 15km radius). Confidence scores validated against 40,000+ historical cases.</p>
        </div>
      </div>

      <div className="space-y-4">
        {outbreakClusters.map(c => (
          <div key={c.id} className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-0">
              {/* Confidence bar on left */}
              <div className={`w-2 self-stretch flex-shrink-0 ${c.confidence >= 85 ? 'bg-red-500' : c.confidence >= 75 ? 'bg-yellow-400' : 'bg-green-500'}`} />
              <div className="flex-1 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-bold font-display text-[#1B4332] text-lg">{c.disease}</h3>
                      <span className={`text-sm px-2 py-0.5 rounded-full font-semibold ${
                        c.trend === 'rising' ? 'bg-red-100 text-red-600' : c.trend === 'stable' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {c.trend === 'rising' ? '↑ Rising' : c.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                      </span>
                    </div>
                    <p className="text-gray-500">📍 {c.block}, {c.district}, {c.state}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                      <span>🐄 {c.casesCount} cases</span>
                      <span>📏 {c.radius}km radius</span>
                      <span>🔬 {c.affectedSpecies.join(', ')}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>First detected: {c.firstDetected}</span>
                      <span>Updated: {c.lastUpdated}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white font-bold ${
                      c.confidence >= 85 ? 'bg-red-500' : c.confidence >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}>
                      <span className="text-2xl font-display">{c.confidence}%</span>
                      <span className="text-xs font-normal opacity-80">confidence</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button className="bg-[#1B4332] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors">
                    View on Map
                  </button>
                  <button className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                    Initiate Containment
                  </button>
                  <button className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                    Alert Vets in Zone
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
