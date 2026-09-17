import { TICKER_ALERTS } from "../data/mockData";

export default function OutbreakTicker() {
  return (
    <div className="bg-[#1B4332] text-white py-2 overflow-hidden relative">
      <div className="flex items-center">
        <span className="bg-[#E63946] text-white text-xs font-bold px-3 py-1 shrink-0 z-10 ml-4 rounded font-display uppercase tracking-wide">
          LIVE
        </span>
        <div className="overflow-hidden flex-1 ml-4">
          <div className="ticker-animation whitespace-nowrap text-sm font-body">
            {[...TICKER_ALERTS, ...TICKER_ALERTS].map((alert, i) => (
              <span key={i} className="mr-16 inline-block">{alert}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
