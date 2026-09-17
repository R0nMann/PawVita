import { useState } from 'react';
import { adminUsers } from '../../data/mockData';

const roleColors: Record<string, string> = {
  farmer: 'bg-green-100 text-green-700',
  vet: 'bg-blue-100 text-blue-700',
  official: 'bg-amber-100 text-amber-700',
  lab: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
};

export default function Users() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = adminUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || u.role === filter)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-[#1B4332]">User Management</h2>
          <p className="text-gray-500">{adminUsers.length} registered users</p>
        </div>
        <button className="bg-[#1B4332] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors font-display">
          + Invite User
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4332] bg-white"
        />
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4332] bg-white">
          <option value="all">All Roles</option>
          <option value="farmer">Farmers</option>
          <option value="vet">Vets</option>
          <option value="official">Officials</option>
          <option value="lab">Lab</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <table>
          <thead>
            <tr className="bg-[#FAF9F6]">
              <th className="text-xs text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Location</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Mobile</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B4332] to-[#40916C] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {u.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                      <p className="text-gray-400 text-xs">{u.id}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleColors[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="text-gray-500 text-sm">{u.district}, {u.state}</td>
                <td className="text-gray-500 text-sm font-mono">{u.mobile}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className={`text-xs font-medium ${u.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{u.status}</span>
                  </div>
                </td>
                <td className="text-gray-400 text-sm">{u.joinedAt}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="text-xs text-sky-600 hover:underline font-medium">Edit</button>
                    <button className="text-xs text-red-500 hover:underline font-medium">{u.status === 'active' ? 'Suspend' : 'Activate'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
