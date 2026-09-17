import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { diseaseFrequencyData, regionComparisonData, riskForecastData } from '../../data/mockData';
import { useState } from 'react';

const seasonalData = [
  { month: 'Jan', FMD: 71, LSD: 15, HS: 22, temp: 18 },
  { month: 'Feb', FMD: 65, LSD: 12, HS: 18, temp: 22 },
  { month: 'Mar', FMD: 48, LSD: 10, HS: 14, temp: 28 },
  { month: 'Apr', FMD: 35, LSD: 8, HS: 10, temp: 33 },
  { month: 'May', FMD: 28, LSD: 6, HS: 8, temp: 37 },
  { month: 'Jun', FMD: 31, LSD: 14, HS: 12, temp: 35 },
  { month: 'Jul', FMD: 42, LSD: 18, HS: 24, temp: 30 },
  { month: 'Aug', FMD: 56, LSD: 22, HS: 19, temp: 29 },
  { month: 'Sep', FMD: 63, LSD: 31, HS: 21, temp: 28 },
  { month: 'Oct', FMD: 48, LSD: 28, HS: 16, temp: 25 },
  { month: 'Nov', FMD: 38, LSD: 24, HS: 14, temp: 20 },
  { month: 'Dec', FMD: 52, LSD: 20, HS: 18, temp: 16 },
];

const TABS = ['Seasonal Trends', 'Regional Comparison', '7-Day Forecast'];

export default function Analytics() {
  const [tab, setTab] = useState(0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Disease Analytics</h2>
        <p className="text-gray-500">Deep-dive charts and predictive forecasting</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Peak Disease Month', value: 'September', icon: '📅', sub: 'Historically highest cases' },
          { label: 'Top Disease 2025', value: 'FMD', icon: '🦷', sub: '71 cases in Jan alone' },
          { label: 'At-Risk Districts', value: '14', icon: '📍', sub: 'Across 4 states' },
          { label: 'Forecast Accuracy', value: '89%', icon: '🎯', sub: 'AI model validation' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
            <div className="text-3xl mb-2">{c.icon}</div>
            <p className="text-2xl font-bold font-display text-[#1B4332]">{c.value}</p>
            <p className="text-sm font-medium text-gray-600">{c.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((t, i) => (
          <button
            key={i}
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
            <h3 className="font-bold font-display text-[#1B4332] mb-5">Seasonal Disease Pattern (Full Year)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={seasonalData}>
                <defs>
                  {[['fmd', '#E63946'], ['lsd', '#4A90D9'], ['hs', '#F4A300']].map(([id, color]) => (
                    <linearGradient key={id} id={`grad_${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Area type="monotone" dataKey="FMD" stroke="#E63946" fill="url(#grad_fmd)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="LSD" stroke="#4A90D9" fill="url(#grad_lsd)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="HS" stroke="#F4A300" fill="url(#grad_hs)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <h3 className="font-bold font-display text-[#1B4332] mb-5">State-wise Disease Load vs Vaccination Coverage</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={regionComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="region" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Bar dataKey="cases" name="Active Cases" fill="#E63946" radius={[6, 6, 0, 0]} />
              <Bar dataKey="vaccinated" name="Vaccination %" fill="#1B4332" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
                formatter={(v, name) => [name === 'risk' ? `${v}% risk` : `${v}°C`, name === 'risk' ? 'Outbreak Risk' : 'Temperature']}
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
