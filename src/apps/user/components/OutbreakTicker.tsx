import { outbreakTicker } from '../data/mockData';

export default function OutbreakTicker() {
  const severityColors: Record<string, string> = {
    high: 'text-red-400',
    medium: 'text-yellow-400',
    low: 'text-green-400',
  };
  const severityDots: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-yellow-400',
    low: 'bg-green-400',
  };

  return (
    <div className="bg-[#0F2D1F] border-b border-[#1B4332] py-2 overflow-hidden">
      <div className="flex items-center">
        <div className="flex-shrink-0 px-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs font-semibold text-red-400 uppercase tracking-widest font-display whitespace-nowrap">Live Alerts</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="animate-ticker flex gap-12 whitespace-nowrap">
            {[...outbreakTicker, ...outbreakTicker].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-xs text-white/80">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${severityDots[item.severity]}`}></span>
                <span className={`font-semibold ${severityColors[item.severity]}`}>{item.disease}</span>
                <span>detected in {item.district}, {item.state}</span>
                <span className="text-white/40">• {item.time}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
