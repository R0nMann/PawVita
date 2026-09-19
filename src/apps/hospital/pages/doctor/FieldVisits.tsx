import { Link } from "react-router";
import { visitApi } from "../../../../api/endpoints";
import { useApiMutation, useVisits } from "../../../../api/queries";
import type { Visit, VisitStatus } from "../../../../api/types";
import { formatDate, formatTime, isoDay, mapsLink } from "../../../../lib/format";
import { EmptyState, FormError, QueryState } from "../../../../shared/ui/States";

const STATUS_COLORS: Record<VisitStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const PIN_COLORS = ["#E63946", "#F4A300", "#4A90D9", "#1B4332", "#9B59B6"];

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function FieldVisits() {
  const visitsQ = useVisits({
    mine: true,
    from: new Date(Date.now() - 14 * 86400000).toISOString(),
    to: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
  const update = useApiMutation(
    ({ id, status }: { id: string; status: VisitStatus }) => visitApi.update(id, { status }),
    [["visits"], ["cases"]],
  );

  const visits = (visitsQ.data?.items ?? []).filter(v => v.status !== "cancelled");
  const count = (s: VisitStatus) => visits.filter(v => v.status === s).length;
  // Order: in progress, then upcoming soonest first, then completed most recent first.
  const ordered = [
    ...visits.filter(v => v.status === "in_progress"),
    ...visits.filter(v => v.status === "scheduled"),
    ...visits.filter(v => v.status === "completed").reverse(),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Field Visits</h1>
        <p className="text-gray-500 text-sm">Scheduled farm visits and route planning</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 text-center">
          <p className="text-3xl font-display font-bold text-[#1B4332]">{count("scheduled")}</p>
          <p className="text-sm text-gray-500 mt-1">Scheduled</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 text-center">
          <p className="text-3xl font-display font-bold text-amber-500">{count("in_progress")}</p>
          <p className="text-sm text-gray-500 mt-1">In Progress</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 text-center">
          <p className="text-3xl font-display font-bold text-green-600">{count("completed")}</p>
          <p className="text-sm text-gray-500 mt-1">Completed</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">All Visits</h2>
          <p className="text-xs text-gray-500">Last two weeks and the next month. Schedule visits from a case.</p>
        </div>
        <QueryState query={visitsQ} loadingLabel="Loading visits…">
          {() =>
            ordered.length === 0 ? (
              <EmptyState icon="🚗" title="No visits" body="Schedule a follow-up visit from any case page." />
            ) : (
              <div className="divide-y divide-gray-50">
                {ordered.map(v => {
                  const link = mapsLink(v.herd.lat, v.herd.lng);
                  return (
                    <div key={v.id} className={`px-5 py-5 ${v.status === "in_progress" ? "bg-amber-50/30" : ""}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${STATUS_COLORS[v.status].split(" ")[0]}`}>
                            🚗
                          </div>
                          <div>
                            <h3 className="font-display font-semibold text-gray-900">{v.herd.name}</h3>
                            <p className="text-sm text-gray-500">📍 {v.herd.address ?? (v.herd.lat != null ? `${v.herd.lat.toFixed(3)}, ${v.herd.lng?.toFixed(3)}` : "Location not recorded")}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[v.status]}`}>
                          {v.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 ml-16">
                        <div>
                          <p className="text-xs text-gray-400">Date & Time</p>
                          <p className="text-sm font-medium text-gray-800">{formatDate(v.scheduledAt)} · {formatTime(v.scheduledAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Purpose</p>
                          <p className="text-sm font-medium text-gray-800">{v.purpose ?? v.type.replace("_", " ")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Case</p>
                          <p className="text-sm font-medium text-gray-800">
                            {v.caseId ? <Link to={`/hospital/doctor/case/${v.caseId}`} className="text-[#4A90D9] hover:underline">Open case →</Link> : "—"}
                          </p>
                        </div>
                      </div>
                      {(v.status === "scheduled" || v.status === "in_progress") && (
                        <div className="mt-4 ml-16 flex flex-wrap gap-3">
                          {v.status === "scheduled" ? (
                            <button disabled={update.isPending} onClick={() => update.mutate({ id: v.id, status: "in_progress" })} className="text-sm text-white gradient-primary px-4 py-2 rounded-lg font-medium">
                              Start Visit
                            </button>
                          ) : (
                            <button disabled={update.isPending} onClick={() => update.mutate({ id: v.id, status: "completed" })} className="text-sm text-white gradient-primary px-4 py-2 rounded-lg font-medium">
                              ✓ Complete Visit
                            </button>
                          )}
                          {link && (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg font-medium hover:bg-gray-50">
                              View Route 🗺️
                            </a>
                          )}
                          {v.status === "scheduled" && (
                            <button disabled={update.isPending} onClick={() => update.mutate({ id: v.id, status: "cancelled" })} className="text-sm text-gray-400 px-2 py-2 hover:text-red-600">
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          }
        </QueryState>
        {update.error ? <div className="px-5 pb-4"><FormError error={update.error} /></div> : null}
      </div>

      <RoutePlanner visits={visits.filter(v => v.status !== "completed" && isoDay(new Date(v.scheduledAt)) === isoDay())} />
    </div>
  );
}

/** Today's stops plotted relative to each other, in visiting order. */
function RoutePlanner({ visits }: { visits: Visit[] }) {
  const stops = visits
    .filter(v => v.herd.lat != null && v.herd.lng != null)
    .map(v => ({ id: v.id, label: v.herd.name, lat: v.herd.lat!, lng: v.herd.lng! }));
  const lats = stops.map(s => s.lat);
  const lngs = stops.map(s => s.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const pos = (s: { lat: number; lng: number }) => ({
    x: 12 + (maxLng > minLng ? ((s.lng - minLng) / (maxLng - minLng)) * 76 : 38),
    y: 15 + (maxLat > minLat ? ((maxLat - s.lat) / (maxLat - minLat)) * 65 : 32),
  });
  const distance = stops.slice(1).reduce((sum, s, i) => sum + distanceKm(stops[i]!, s), 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-display font-semibold text-gray-900">Route Planner</h2>
        <p className="text-xs text-gray-500 mt-0.5">Today's visits in order</p>
      </div>
      <div className="bg-gradient-to-br from-[#1B4332]/5 to-[#4A90D9]/10 h-64 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute border border-gray-400" style={{ left: `${i * 12.5}%`, top: 0, bottom: 0, width: "1px" }}></div>
          ))}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute border border-gray-400" style={{ top: `${i * 16.6}%`, left: 0, right: 0, height: "1px" }}></div>
          ))}
        </div>
        {stops.length === 0 ? (
          <p className="relative text-sm text-gray-500">No visits with a location today.</p>
        ) : (
          <>
            {stops.map((s, i) => {
              const p = pos(s);
              return (
                <div key={s.id} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  <div className="text-2xl">📍</div>
                  <div className="bg-white shadow rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap mt-1" style={{ color: PIN_COLORS[i % PIN_COLORS.length] }}>
                    {i + 1}. {s.label}
                  </div>
                </div>
              );
            })}
            {/* SVG `points` takes numbers, not percentages — a 0-100 viewBox stretched
                to the container gives the same proportional placement as the pins. */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline
                points={stops.map(s => { const p = pos(s); return `${p.x + 1.5},${p.y + 4}`; }).join(" ")}
                fill="none"
                stroke="#1B4332"
                strokeWidth="0.5"
                strokeDasharray="2 1.5"
                vectorEffect="non-scaling-stroke"
                opacity="0.5"
              />
            </svg>
          </>
        )}
      </div>
      <div className="px-5 py-3 bg-gray-50 text-sm text-gray-600 flex flex-wrap items-center gap-4">
        <span>📏 Distance between stops: ~{Math.round(distance)} km (straight line)</span>
        <span>⏱️ Driving estimate: {(distance / 35).toFixed(1)} hrs</span>
        <span>⛽ {stops.length} stops planned</span>
      </div>
    </div>
  );
}
