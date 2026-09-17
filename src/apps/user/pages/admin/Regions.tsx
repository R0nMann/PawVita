export default function Regions() {
  const regions = [
    { id: 'R001', state: 'Gujarat', district: 'Anand', blocks: 8, villages: 342, alertThreshold: 5, vets: 12, farmers: 4820 },
    { id: 'R002', state: 'Gujarat', district: 'Kutch', blocks: 10, villages: 421, alertThreshold: 8, vets: 9, farmers: 3210 },
    { id: 'R003', state: 'Rajasthan', district: 'Bikaner', blocks: 7, villages: 285, alertThreshold: 4, vets: 8, farmers: 6100 },
    { id: 'R004', state: 'UP', district: 'Varanasi', blocks: 12, villages: 498, alertThreshold: 6, vets: 15, farmers: 8900 },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-[#1B4332]">Regional Configuration</h2>
          <p className="text-gray-500">Configure districts, blocks, and alert thresholds</p>
        </div>
        <button className="bg-[#1B4332] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors font-display">
          + Add Region
        </button>
      </div>

      <div className="space-y-4">
        {regions.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold font-display text-[#1B4332] text-lg">{r.district} District</h3>
                <p className="text-gray-500">{r.state}</p>
              </div>
              <div className="flex gap-2">
                <button className="text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                <button className="text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">Configure</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['Blocks', r.blocks],
                ['Villages', r.villages],
                ['Farmers', r.farmers.toLocaleString()],
                ['Vet Officers', r.vets],
                ['Alert Threshold', `${r.alertThreshold} cases`],
              ].map(([l, v]) => (
                <div key={l as string} className="bg-[#FAF9F6] rounded-xl p-3">
                  <p className="text-xs text-gray-400">{l}</p>
                  <p className="font-bold font-display text-[#1B4332]">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
