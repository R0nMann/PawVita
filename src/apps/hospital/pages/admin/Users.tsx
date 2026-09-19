import UsersAdmin from "../../../../shared/admin/UsersAdmin";

export default function Users() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm">Approve registrations, manage staff accounts and access</p>
      </div>
      <UsersAdmin />
    </div>
  );
}
