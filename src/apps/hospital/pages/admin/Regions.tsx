import { REGIONS } from "../../data/mockData";

export default function AdminRegions() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Regional Configuration</h1>
          <p className="text-gray-500 text-sm">Manage state/district/block surveillance zones and alert thresholds</p>
        </div>
        <button className="gradient-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm">+ Add Region</button>
      </div>

      <div className="space-y-4">
        {REGIONS.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-gray-900">{r.state}</h2>
                <p className="text-sm text-gray-500">Region ID: {r.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.alerts > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
                    {r.alerts} Active Alert{r.alerts > 1 ? "s" : ""}
                  </span>
                )}
                <button className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Edit</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-display font-bold text-[#1B4332]">{r.districts}</p>
                <p className="text-xs text-gray-500">Districts</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-display font-bold text-[#1B4332]">{r.blocks}</p>
                <p className="text-xs text-gray-500">Blocks</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-display font-bold text-[#1B4332]">{r.villages.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Villages</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-display font-bold text-[#1B4332]">{r.vets}</p>
                <p className="text-xs text-gray-500">Vets</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Alert Threshold: <strong className="text-gray-900">{r.threshold} cases/block</strong></span>
                <button className="text-xs text-[#4A90D9] hover:underline">Change threshold</button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Last sync: {new Date(r.lastSync).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
