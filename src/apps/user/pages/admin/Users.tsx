import UsersAdmin from '../../../../shared/admin/UsersAdmin';

export default function Users() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">User Management</h2>
        <p className="text-gray-500">Approve registrations, manage staff accounts and access</p>
      </div>
      <UsersAdmin />
    </div>
  );
}
