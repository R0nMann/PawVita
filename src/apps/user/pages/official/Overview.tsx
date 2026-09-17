import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { diseaseFrequencyData, riskForecastData, vaccinationCoverageData, regionComparisonData, outbreakClusters } from '../../data/mockData';
import StatCard from '../../components/StatCard';
import OutbreakTicker from '../../components/OutbreakTicker';
import { Link } from 'react-router';

export default function Overview() {
  return (
    <div>
      <OutbreakTicker />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold font-display text-[#1B4332]">District Overview — Anand, Gujarat</h2>
            <p className="text-gray-500">Updated: January 9, 2025 09:30 IST</p>
          </div>
          <Link to="/user/official/reports" className="bg-[#1B4332] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors font-display">
            Generate Report ↓
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatCard label="Active Outbreaks" value={5} icon="🔥" gradient="gradient-card-alert" trend={{ value: 2, label: 'vs last week' }} />
          <StatCard label="Active Cases" value={1847} icon="📋" gradient="gradient-card-amber" delay={100} trend={{ value: -8, label: 'vs last week' }} />
          <StatCard label="Animals Vaccinated" value={3240000} icon="💉" gradient="gradient-card-green" delay={200} trend={{ value: 12, label: 'this month' }} />
          <StatCard label="Vaccination Coverage" value={78} suffix="%" icon="🛡️" gradient="gradient-card-sky" delay={300} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Disease Trend */}
          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold font-display text-[#1B4332]">Disease Frequency Trend</h3>
              <span className="text-xs text-gray-400">Last 7 months</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={diseaseFrequencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="FMD" stroke="#E63946" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="LSD" stroke="#4A90D9" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="HS" stroke="#F4A300" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="BQ" stroke="#1B4332" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 7-day Risk Forecast */}
          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold font-display text-[#1B4332]">7-Day Risk Forecast</h3>
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-semibold">AI Model</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskForecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(v) => [`${v}%`, 'Risk Score']}
                />
                <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                  {riskForecastData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.risk >= 75 ? '#E63946' : entry.risk >= 60 ? '#FFD166' : '#40916C'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 mt-2 text-center">Based on weather data + historical outbreak patterns</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Vaccination Donut */}
          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <h3 className="font-bold font-display text-[#1B4332] mb-5">Vaccination Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={vaccinationCoverageData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {vaccinationCoverageData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} />
                <Tooltip formatter={(v) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Region Comparison */}
          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 col-span-1 lg:col-span-2">
            <h3 className="font-bold font-display text-[#1B4332] mb-5">Regional Disease Load vs Vaccination</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={regionComparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="cases" name="Cases" fill="#E63946" radius={[0, 4, 4, 0]} barSize={8} />
                <Bar dataKey="vaccinated" name="Vacc. %" fill="#1B4332" radius={[0, 4, 4, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Clusters */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold font-display text-[#1B4332] text-lg">AI-Flagged Outbreak Clusters</h3>
            <Link to="/user/official/outbreak-clusters" className="text-sm text-[#1B4332] font-semibold hover:underline">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr className="bg-[#FAF9F6]">
                  <th className="text-xs text-gray-500 uppercase tracking-wide">Disease</th>
                  <th className="text-xs text-gray-500 uppercase tracking-wide">Location</th>
                  <th className="text-xs text-gray-500 uppercase tracking-wide">Cases</th>
                  <th className="text-xs text-gray-500 uppercase tracking-wide">AI Confidence</th>
                  <th className="text-xs text-gray-500 uppercase tracking-wide">Trend</th>
                  <th className="text-xs text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {outbreakClusters.map(c => (
                  <tr key={c.id}>
                    <td className="font-semibold text-gray-800">{c.disease}</td>
                    <td className="text-gray-500 text-sm">{c.district}, {c.state}</td>
                    <td className="font-bold text-gray-800">{c.casesCount}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-2 rounded-full" style={{ width: `${c.confidence}%`, background: c.confidence >= 85 ? '#E63946' : c.confidence >= 75 ? '#F4A300' : '#40916C' }} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{c.confidence}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        c.trend === 'rising' ? 'bg-red-100 text-red-600' : c.trend === 'stable' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {c.trend === 'rising' ? '↑ Rising' : c.trend === 'declining' ? '↓ Declining' : '→ Stable'}
                      </span>
                    </td>
                    <td>
                      <Link to="/user/official/risk-map" className="text-sky-600 text-sm font-semibold hover:underline">View Map</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
