import { useState } from "react";
import { adminApi } from "../../api/endpoints";
import { useAdminUsers, useApiMutation, useOrganizations } from "../../api/queries";
import type { AdminUser, BackendRole, Region } from "../../api/types";
import { useSession } from "../../auth/AuthContext";
import { formatDate } from "../../lib/format";
import Modal, { Field, inputClass } from "../ui/Modal";
import RegionPicker from "../ui/RegionPicker";
import { FormError, QueryState } from "../ui/States";

const ROLE_LABEL: Record<BackendRole, string> = {
  farmer: "Farmer",
  field_worker: "Field worker",
  vet: "Vet",
  ward_staff: "Ward staff",
  lab_tech: "Lab",
  official: "Official",
  admin: "Admin",
};

const ROLE_COLOR: Record<BackendRole, string> = {
  farmer: "bg-green-100 text-green-700",
  field_worker: "bg-teal-100 text-teal-700",
  vet: "bg-blue-100 text-blue-700",
  ward_staff: "bg-sky-100 text-sky-700",
  lab_tech: "bg-purple-100 text-purple-700",
  official: "bg-amber-100 text-amber-700",
  admin: "bg-red-100 text-red-700",
};

const INVALIDATE = [["admin", "users"]];

/** User management with the approval queue first — shared by both portals' admin consoles. */
export default function UsersAdmin() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [inviting, setInviting] = useState(false);
  const [approving, setApproving] = useState<AdminUser | null>(null);
  const usersQ = useAdminUsers({ q: search.trim() || undefined, role: role || undefined, status: status || undefined });
  const update = useApiMutation(
    ({ id, status: next }: { id: string; status: "active" | "suspended" }) => adminApi.updateUser(id, { status: next }),
    INVALIDATE,
  );
  const pending = (usersQ.data?.items ?? []).filter((u) => u.status === "pending").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-gray-500 text-sm">
          {usersQ.data ? `${usersQ.data.items.length}${usersQ.data.hasMore ? "+" : ""} users` : "Loading…"}
          {pending > 0 && <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">{pending} awaiting approval</span>}
        </p>
        <button
          onClick={() => setInviting(true)}
          className="bg-[#1B4332] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors font-display"
        >
          + Add Staff Account
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email…"
          aria-label="Search users"
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4332] bg-white"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4332] bg-white">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4332] bg-white">
          <option value="">Any status</option>
          <option value="pending">Pending approval</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <FormError error={update.error} />

      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-x-auto">
        <QueryState query={usersQ} loadingLabel="Loading users…">
          {(data) => (
            <table className="w-full">
              <thead className="bg-[#FAF9F6]">
                <tr>
                  {["User", "Role", "Area", "Contact", "Status", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map((u) => (
                  <tr key={u.id} className={u.status === "pending" ? "bg-amber-50/40" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B4332] to-[#40916C] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {u.fullName.replace(/^Dr\.?\s+/, "").charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{u.fullName}</p>
                          <p className="text-gray-400 text-xs">{u.username ?? (u.hasLogin ? "" : "no login yet")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLOR[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {u.region ? u.region.path.slice(-2).map((p) => p.name).reverse().join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm font-mono">{u.phone ?? u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${u.status === "active" ? "bg-green-500" : u.status === "pending" ? "bg-amber-400" : "bg-gray-300"}`}></span>
                        <span className={`text-xs font-medium ${u.status === "active" ? "text-green-600" : u.status === "pending" ? "text-amber-700" : "text-gray-400"}`}>
                          {u.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.id !== session.account.id && (
                        <div className="flex gap-3">
                          {u.status === "pending" && (
                            <button onClick={() => setApproving(u)} className="text-xs text-green-700 hover:underline font-semibold">
                              Approve
                            </button>
                          )}
                          {u.status === "active" && (
                            <button disabled={update.isPending} onClick={() => update.mutate({ id: u.id, status: "suspended" })} className="text-xs text-red-500 hover:underline font-medium">
                              Suspend
                            </button>
                          )}
                          {u.status === "suspended" && (
                            <button disabled={update.isPending} onClick={() => update.mutate({ id: u.id, status: "active" })} className="text-xs text-sky-600 hover:underline font-medium">
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </QueryState>
      </div>

      <InviteModal open={inviting} onClose={() => setInviting(false)} />
      <ApproveModal user={approving} onClose={() => setApproving(null)} />
    </div>
  );
}

/** Approve a pending registration, setting the area they cover. */
function ApproveModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const [region, setRegion] = useState<Region | null>(null);
  const approve = useApiMutation(
    () => adminApi.approve(user!.id, region ? { regionId: region.id } : {}),
    INVALIDATE,
  );
  return (
    <Modal open={!!user} onClose={onClose} title={`Approve ${user?.fullName ?? ""}`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Registered as <span className="font-semibold">{user ? ROLE_LABEL[user.role] : ""}</span>
          {user?.region ? ` for ${user.region.name}` : ""}. Their area decides which cases they see.
        </p>
        <p className="text-sm font-semibold text-gray-700">Area of responsibility {user?.region ? "(leave empty to keep theirs)" : ""}</p>
        <RegionPicker onChange={setRegion} selectClass={inputClass} />
        <FormError error={approve.error} />
        <button
          disabled={approve.isPending || (!user?.region && !region)}
          onClick={() => approve.mutate(undefined, { onSuccess: onClose })}
          className="w-full bg-[#1B4332] text-white py-3 rounded-xl font-bold font-display disabled:opacity-50"
        >
          {approve.isPending ? "Approving…" : "Approve account"}
        </button>
      </div>
    </Modal>
  );
}

const STAFF_ROLES: BackendRole[] = ["vet", "ward_staff", "lab_tech", "official", "field_worker", "admin"];

/** Create a staff account directly — already approved, with a password login. */
function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const orgs = useOrganizations();
  const [form, setForm] = useState({ fullName: "", role: "vet" as BackendRole, email: "", username: "", phone: "", password: "", organizationId: "" });
  const [region, setRegion] = useState<Region | null>(null);
  const create = useApiMutation(
    () =>
      adminApi.createUser({
        fullName: form.fullName.trim(),
        role: form.role,
        email: form.email.trim() || undefined,
        username: form.username.trim() || undefined,
        phone: form.phone || undefined,
        password: form.password || undefined,
        organizationId: form.organizationId || undefined,
        regionId: region?.id,
      }),
    INVALIDATE,
  );

  return (
    <Modal open={open} onClose={onClose} title="Add a staff account" wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(undefined, {
            onSuccess: () => {
              setForm({ fullName: "", role: "vet", email: "", username: "", phone: "", password: "", organizationId: "" });
              onClose();
            },
          });
        }}
        className="space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full name">
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as BackendRole })} className={inputClass}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Temporary password" hint="At least 8 characters; needs an email.">
            <input type="text" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Staff ID (optional)">
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="dr.priya" className={inputClass} />
          </Field>
          <Field label="Mobile (optional)" hint="Lets them sign in with OTP.">
            <input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} className={inputClass} />
          </Field>
          <Field label="Hospital / lab / department">
            <select value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} className={inputClass}>
              <option value="">—</option>
              {(orgs.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Area of responsibility</p>
          <RegionPicker onChange={setRegion} selectClass={inputClass} />
        </div>
        <FormError error={create.error} />
        <button disabled={create.isPending} className="w-full bg-[#1B4332] text-white py-3 rounded-xl font-bold font-display disabled:opacity-50">
          {create.isPending ? "Creating…" : "Create account"}
        </button>
      </form>
    </Modal>
  );
}
