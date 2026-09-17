import { PORTALS, roleFor } from "../../auth/portals";
import type { PortalId } from "../../auth/portals";

/**
 * Role selector inside a chosen portal. A native select is deliberate: the
 * platform already gives keyboard operation, a mobile-friendly picker and
 * correct screen-reader announcement for a list this long.
 */
export default function RolePicker({
  portal,
  value,
  onChange,
  id,
}: {
  portal: PortalId;
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const roles = PORTALS[portal].roles;
  const role = roleFor(portal, value);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-2">
        Your role
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={id + "-desc"}
        className="w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring"
      >
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <p id={id + "-desc"} className="text-xs text-gray-500 mt-2">
        {role.desc}
      </p>
    </div>
  );
}
