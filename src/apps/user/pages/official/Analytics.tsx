import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { useState } from 'react';
import { riskForecastData } from '../../data/aiPreview';
import { useCatalog } from '../../../../api/queries';
import { diseaseName } from '../../../../lib/format';
import { useDiseaseTrend, useRegionComparison } from '../../../../shared/analytics/charts';

const TABS = ['Seasonal Trends', 'Regional Comparison', '7-Day Forecast'];

export default function Analytics() {
  const [tab, setTab] = useState(0);
  const catalog = useCatalog();
  const seasonal = useDiseaseTrend({ months: 12, top: 3 });
  const regions = useRegionComparison();

  const peak = seasonal.data.reduce<{ month: string; total: number } | null>(
    (best, b) => (!best || b.total > best.total ? { month: b.month, total: b.total } : best),
    null,
  );
  const [topCode, topCount] = [...seasonal.totals.entries()].filter(([k]) => k !== 'undiagnosed').sort((a, b) => b[1] - a[1])[0] ?? [];
  const atRisk = regions.rows.filter(r => r.highRiskOpen > 0);

  const cards = [
    { label: 'Peak Disease Month', value: peak && peak.total > 0 ? peak.month : '—', icon: '📅', sub: peak ? `${peak.total} cases in the last 12 months` : 'No data yet' },
    { label: 'Top Disease', value: topCode ? topCode.toUpperCase() : '—', icon: '🦷', sub: topCode ? `${topCount} cases · ${diseaseName(topCode, catalog.data)}` : 'No diagnosed cases' },
    { label: `At-Risk ${regions.level ? regions.level[0]!.toUpperCase() + regions.level.slice(1) + 's' : 'Areas'}`, value: String(atRisk.length), icon: '📍', sub: 'With open high-risk cases' },
    { label: 'Forecast Accuracy', value: '89%', icon: '🎯', sub: 'AI model validation' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Disease Analytics</h2>
        <p className="text-gray-500">Deep-dive charts and predictive forecasting</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
            <div className="text-3xl mb-2">{c.icon}</div>
            <p className="text-2xl font-bold font-display text-[#1B4332]">{c.value}</p>
            <p className="text-sm font-medium text-gray-600">{c.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit" role="tablist">
        {TABS.map((t, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all font-display ${tab === i ? 'bg-white shadow-sm text-[#1B4332]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <h3 className="font-bold font-display text-[#1B4332] mb-5">Seasonal Disease Pattern (Last 12 Months)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={seasonal.data}>
                <defs>
                  {seasonal.keys.map(k => (
                    <linearGradient key={k.key} id={`grad_${k.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={k.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={k.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                {seasonal.keys.map(k => (
                  <Area key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color} fill={`url(#grad_${k.key})`} strokeWidth={2.5} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <h3 className="font-bold font-display text-[#1B4332] mb-5">Disease Load vs Vaccination Coverage by {regions.level ?? 'region'}</h3>
          {regions.rows.length === 0 && !regions.isPending ? (
            <p className="text-sm text-gray-400 py-16 text-center">No data for your area yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={regions.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="open" name="Active Cases" fill="#E63946" radius={[6, 6, 0, 0]} />
                <Bar dataKey="vaccinated" name="Vaccination %" fill="#1B4332" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === 2 && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold font-display text-[#1B4332]">7-Day Outbreak Risk Forecast</h3>
            <span className="text-xs bg-purple-100 text-purple-600 px-3 py-1.5 rounded-full font-semibold">AI Model • 89% accuracy</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={riskForecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value, name) => [name === 'risk' ? `${value}% risk` : `${value}°C`, name === 'risk' ? 'Outbreak Risk' : 'Temperature']}
              />
              <Legend />
              <Line type="monotone" dataKey="risk" name="risk" stroke="#E63946" strokeWidth={3} dot={{ fill: '#E63946', r: 5 }} />
              <Line type="monotone" dataKey="temperature" name="temperature" stroke="#4A90D9" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="font-semibold text-red-700 font-display">⚠️ High-Risk Period Alert</p>
            <p className="text-sm text-red-600 mt-1">AI model predicts 81% outbreak risk on Wednesday due to temperature spike + high humidity. Recommend pre-emptive vet deployment in Bikaner and Kutch districts.</p>
          </div>
        </div>
      )}
    </div>
  );
}
