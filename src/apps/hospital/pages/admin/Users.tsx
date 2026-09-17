import { useState } from "react";
import { USERS } from "../../data/mockData";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  hospital: { label: "Hospital", color: "text-blue-700", bg: "bg-blue-100" },
  veterinarian: { label: "Veterinarian", color: "text-green-700", bg: "bg-green-100" },
  official: { label: "Official", color: "text-purple-700", bg: "bg-purple-100" },
  lab: { label: "Lab Tech", color: "text-orange-700", bg: "bg-orange-100" },
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = USERS.filter(u =>
    (roleFilter === "all" || u.role === roleFilter) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.district.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">{USERS.length} registered users across all roles</p>
        </div>
        <button className="gradient-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md">+ Invite User</button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or district..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1B4332]"
          />
        </div>
        <div className="flex gap-2">
          {["all", "hospital", "veterinarian", "official", "lab"].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${roleFilter === r ? "gradient-primary text-white" : "bg-white border border-[#E8E5DF] text-gray-600"}`}
            >
              {r === "all" ? "All" : ROLE_CONFIG[r]?.label || r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["User", "Role", "Location", "Status", "Joined", "Cases", "Actions"].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(u => {
              const r = ROLE_CONFIG[u.role];
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 gradient-primary rounded-full flex items-center justify-center text-white font-bold text-sm font-display">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${r?.bg} ${r?.color}`}>{r?.label || u.role}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{u.district}, {u.state}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${u.status === "active" ? "bg-green-500" : "bg-gray-300"}`}></div>
                      <span className={`text-xs font-medium ${u.status === "active" ? "text-green-600" : "text-gray-400"}`}>{u.status}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{u.joined}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">{u.cases > 0 ? u.cases : "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="text-xs text-[#4A90D9] hover:underline font-medium">Edit</button>
                      <button className="text-xs text-red-400 hover:underline font-medium">{u.status === "active" ? "Suspend" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">👤</p>
            <p>No users found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
