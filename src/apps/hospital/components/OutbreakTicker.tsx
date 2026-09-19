import { usePublicAlerts } from "../../../api/queries";

const ICON: Record<string, string> = { high: "🔴 ALERT", moderate: "🟡 WATCH", low: "🟢 NOTICE" };

/** Scrolling strip of open cases per district and disease over the last fortnight. */
export default function OutbreakTicker() {
  const { data: alerts = [] } = usePublicAlerts();
  const lines = alerts.map(
    (a) =>
      `${ICON[a.severity]}: ${a.diseaseName ?? a.diseaseCode.toUpperCase()} in ${a.district}${a.state ? `, ${a.state}` : ""} — ${a.cases} open case${a.cases === 1 ? "" : "s"}`,
  );

  return (
    <div className="bg-[#1B4332] text-white py-2 overflow-hidden relative">
      <div className="flex items-center">
        <span className="bg-[#E63946] text-white text-xs font-bold px-3 py-1 shrink-0 z-10 ml-4 rounded font-display uppercase tracking-wide">
          LIVE
        </span>
        <div className="overflow-hidden flex-1 ml-4">
          {lines.length === 0 ? (
            <span className="text-sm font-body text-white/70">✅ No active outbreak alerts in the last 14 days</span>
          ) : (
            <div className="ticker-animation whitespace-nowrap text-sm font-body">
              {[...lines, ...lines].map((line, i) => (
                <span key={i} className="mr-16 inline-block">{line}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
