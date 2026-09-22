import { PORTAL_LIST } from "../../auth/portals";
import type { Portal, PortalId } from "../../auth/portals";
import { IconCheck, IconHospital, IconLeaf, IconShield } from "./Icons";

const ICONS: Record<PortalId, React.ComponentType<{ className?: string }>> = {
  user: IconLeaf,
  hospital: IconHospital,
  admin: IconShield,
};

/**
 * The "I am a..." gateway shared by sign-in and registration.
 *
 * Built on native radio inputs: arrow-key navigation, grouping and the checked
 * state all come from the platform, so the visual cards never have to fake them.
 */
export default function PortalChoice({
  value,
  onChange,
  name,
  legend = "Which portal are you using?",
  portals = PORTAL_LIST,
}: {
  value: PortalId;
  onChange: (id: PortalId) => void;
  name: string;
  legend?: string;
  /** Narrow the choice — registration only offers portals people can join. */
  portals?: Portal[];
}) {
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="text-sm font-semibold text-gray-700 mb-3">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {portals.map((portal) => {
          const Icon = ICONS[portal.id];
          const selected = value === portal.id;
          return (
            <label
              key={portal.id}
              className={`choice-card relative flex flex-col gap-3 p-5 rounded-2xl border-2 cursor-pointer transition-colors ${
                selected
                  ? "border-[#1B4332] bg-[#E8F1EC]"
                  : "border-[#E8E5DF] bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={portal.id}
                checked={selected}
                onChange={() => onChange(portal.id)}
                className="sr-only"
              />
              <span className="flex items-center justify-between">
                <span
                  className="w-11 h-11 rounded-xl grid place-items-center text-xl"
                  style={{
                    background: selected ? portal.accent : portal.accentSoft,
                    color: selected ? "#fff" : portal.accent,
                  }}
                  aria-hidden="true"
                >
                  <Icon />
                </span>
                {selected && (
                  <span
                    className="w-6 h-6 rounded-full bg-[#1B4332] text-white grid place-items-center text-xs"
                    aria-hidden="true"
                  >
                    <IconCheck />
                  </span>
                )}
              </span>
              <span>
                <span className="block font-display font-bold text-gray-900">{portal.name}</span>
                <span className="block text-sm text-gray-600 mt-1 leading-relaxed">{portal.tagline}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
