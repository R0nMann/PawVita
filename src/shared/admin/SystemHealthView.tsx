import { useSystemHealth } from "../../api/queries";
import { useOutbox } from "../../offline/useOutbox";
import { QueryState } from "../ui/States";

const STATUS_STYLE: Record<string, { dot: string; badge: string }> = {
  operational: { dot: "bg-green-500", badge: "bg-green-100 text-green-700" },
  not_configured: { dot: "bg-gray-300", badge: "bg-gray-100 text-gray-600" },
  down: { dot: "bg-red-500", badge: "bg-red-100 text-red-700" },
};

function uptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

/** Live service status and sync statistics from the API — shared by both admin consoles. */
export default function SystemHealthView() {
  const healthQ = useSystemHealth();
  const outbox = useOutbox();

  return (
    <QueryState query={healthQ} loadingLabel="Checking services…">
      {(h) => {
        const services = [
          { name: "API Server", status: h.services.api.status, detail: `Up ${uptime(h.services.api.uptimeSeconds)} · Node ${h.runtime.node}` },
          { name: "Database", status: h.services.database.status, detail: `${h.services.database.driver} · ${h.services.database.latencyMs ?? "—"} ms`, error: h.services.database.error },
          { name: "File Storage", status: h.services.storage.status, detail: `${h.services.storage.provider} · ${h.services.storage.latencyMs ?? "—"} ms`, error: h.services.storage.error },
          { name: "Authentication", status: h.services.auth.status, detail: h.services.auth.provider === "supabase" ? "Supabase Auth" : "Local development auth" },
          { name: "AI/ML Engine", status: h.services.ai.status, detail: h.services.ai.status === "not_configured" ? "AI services not connected yet" : `${h.services.ai.pending} pending · ${h.services.ai.failed} failed (7d)` },
        ];
        const down = services.filter((s) => s.status === "down").length;
        const sync = h.queues.offlineSyncLast7Days;
        return (
          <div className="space-y-6">
            <div className={`${down ? "bg-gradient-to-r from-red-700 to-red-500" : "gradient-card-green"} rounded-2xl p-5 text-white`}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🖥️</div>
                <div>
                  <p className="text-white/70 text-sm">API uptime since last restart</p>
                  <p className="text-4xl font-bold font-display">{uptime(h.services.api.uptimeSeconds)}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-white/70 text-sm">Status · {h.runtime.environment}</p>
                  <p className="text-xl font-bold font-display">{down ? `${down} service(s) down` : "All Systems Operational"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 text-center">
                <p className="text-3xl font-display font-bold text-gray-900">{h.queues.openCases}</p>
                <p className="text-sm text-gray-500 mt-1">Open cases</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <p className="text-3xl font-display font-bold text-amber-600">{h.queues.pendingRegistrations}</p>
                <p className="text-sm text-amber-700 mt-1">Registrations awaiting approval</p>
              </div>
              <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 text-center">
                <p className="text-3xl font-display font-bold text-gray-900">{h.runtime.memoryMb} MB</p>
                <p className="text-sm text-gray-500 mt-1">API memory</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold font-display text-[#1B4332] text-lg mb-4">Service Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {services.map((s) => {
                  const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.down!;
                  return (
                    <div key={s.name} className="bg-white rounded-2xl p-4 border border-[#E8E5DF]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`}></div>
                          <p className="font-semibold text-gray-800 font-display">{s.name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${style.badge}`}>{s.status.replace("_", " ")}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{s.detail}</p>
                      {s.error && <p className="text-xs text-red-600 mt-1">{s.error}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold font-display text-[#1B4332]">Offline Sync</h3>
              </div>
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                <div className="p-5">
                  <p className="text-2xl font-display font-bold text-gray-900">{sync.count}</p>
                  <p className="text-sm text-gray-500">Reports captured offline and synced (7 days)</p>
                </div>
                <div className="p-5">
                  <p className="text-2xl font-display font-bold text-gray-900">{sync.avgDelayMinutes != null ? `${sync.avgDelayMinutes} min` : "—"}</p>
                  <p className="text-sm text-gray-500">Average delay before reaching the server (max {sync.maxDelayMinutes ?? "—"} min)</p>
                </div>
                <div className="p-5">
                  <p className="text-2xl font-display font-bold text-gray-900">{outbox.items.length}</p>
                  <p className="text-sm text-gray-500">Items waiting on this device</p>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
