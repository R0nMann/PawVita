import { useEffect, useState } from "react";
import { usePublicAlerts } from "../../api/queries";
import { timeAgo } from "../../lib/format";
import { IconAlert } from "./Icons";

const SEVERITY: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-[#FF6B6B]", label: "High severity" },
  moderate: { dot: "bg-amber-300", label: "Moderate severity" },
  low: { dot: "bg-emerald-300", label: "Low severity" },
};

/**
 * Live outbreak strip above the public navigation: open cases per district
 * and disease over the last fortnight, from the API's public aggregates.
 *
 * Auto-rotating content needs a pause control and must not move for people who
 * ask for reduced motion (WCAG 2.2), so this steps through items on a timer that
 * the visitor can stop, rather than a CSS marquee that cannot be paused.
 */
export default function OutbreakTicker() {
  const { data: alerts = [] } = usePublicAlerts();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || alerts.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % alerts.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [paused, alerts.length]);

  const item = alerts.length ? alerts[index % alerts.length] : undefined;
  const severity = SEVERITY[item?.severity ?? "low"] ?? SEVERITY.low!;

  return (
    <div className="bg-[#0F2D1F] text-white text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-semibold text-amber-400 shrink-0">
          <span aria-hidden="true">
            <IconAlert />
          </span>
          Live alerts
        </span>

        <p className="flex-1 min-w-0 truncate text-white/80" aria-live="off">
          {item ? (
            <>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${severity.dot}`} aria-hidden="true" />
              <span className="sr-only">{severity.label}. </span>
              <span className="font-semibold text-white">{item.diseaseName ?? item.diseaseCode.toUpperCase()}</span>
              {" — "}
              {item.cases} open case{item.cases === 1 ? "" : "s"} in {item.district}
              {item.state ? `, ${item.state}` : ""}
              <span className="text-white/50"> · {timeAgo(item.latest)}</span>
            </>
          ) : (
            "No active outbreak alerts in the last 14 days."
          )}
        </p>

        {alerts.length > 1 && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            className="shrink-0 px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-ring"
          >
            {paused ? "Play" : "Pause"}
            <span className="sr-only"> rotating outbreak alerts</span>
          </button>
        )}
      </div>
    </div>
  );
}
