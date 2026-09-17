import { Link } from "react-router";
import { SAMPLES } from "../../data/mockData";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "URGENT", color: "text-red-700", bg: "bg-red-100" },
  normal: { label: "NORMAL", color: "text-blue-700", bg: "bg-blue-100" },
  routine: { label: "ROUTINE", color: "text-gray-600", bg: "bg-gray-100" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-100" },
  processing: { color: "text-blue-700", bg: "bg-blue-100" },
  completed: { color: "text-green-700", bg: "bg-green-100" },
};

export default function LabQueue() {
  const pending = SAMPLES.filter(s => s.status === "pending");
  const processing = SAMPLES.filter(s => s.status === "processing");
  const completed = SAMPLES.filter(s => s.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Sample Queue</h1>
        <p className="text-gray-500 text-sm">Incoming diagnostic samples — priority sorted</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-amber-600">{pending.length}</p>
          <p className="text-sm text-amber-700 mt-1">Pending</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-blue-600">{processing.length}</p>
          <p className="text-sm text-blue-700 mt-1">Processing</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-green-600">{completed.length}</p>
          <p className="text-sm text-green-700 mt-1">Completed</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">All Samples</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {[...SAMPLES].sort((a, b) => {
            const order = { urgent: 0, normal: 1, routine: 2 };
            return (order[a.priority as keyof typeof order] || 2) - (order[b.priority as keyof typeof order] || 2);
          }).map(s => {
            const p = PRIORITY_CONFIG[s.priority] || PRIORITY_CONFIG.routine;
            const st = STATUS_CONFIG[s.status];
            return (
              <Link key={s.id} to={`/hospital/lab/sample/${s.id}`}>
                <div className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🧪</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-400">{s.id}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>{p.label}</span>
                        </div>
                        <p className="font-display font-semibold text-gray-900">{s.animalName} — {s.disease}</p>
                        <p className="text-sm text-gray-500">{s.type} · Requested by {s.requestedBy}</p>
                        <div className="flex gap-1 mt-2">
                          {s.tests.map(t => (
                            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full block mb-1 ${st.bg} ${st.color}`}>
                        {s.status}
                      </span>
                      <p className="text-xs text-gray-400">{new Date(s.collectedAt).toLocaleDateString()}</p>
                      {s.result && <p className="text-xs text-green-700 font-medium mt-1 max-w-[160px] text-right">Result: {s.result.split(" ")[0]}</p>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
