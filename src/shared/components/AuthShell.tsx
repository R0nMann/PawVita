import { Link } from "react-router";
import type { ReactNode } from "react";
import { PORTALS } from "../../auth/portals";
import type { PortalId } from "../../auth/portals";
import { IconCheck, IconGlobe, IconShield, IconWifiOff } from "./Icons";

const ASSURANCES = [
  { Icon: IconGlobe, label: "22 Indian languages" },
  { Icon: IconWifiOff, label: "Works offline in low-signal villages" },
  { Icon: IconShield, label: "Government of India initiative" },
];

/**
 * Two-column frame for sign-in and registration: a brand panel that explains
 * what the chosen portal does, and the form itself. The panel collapses away
 * under 1024px so the form is the first thing on a phone.
 */
export default function AuthShell({
  portal,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  /** null while the visitor has not chosen a portal yet. */
  portal: PortalId | null;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const config = portal ? PORTALS[portal] : null;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] bg-[#FAF9F6]">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col justify-between gradient-hero px-12 py-12 text-white">
        <Link
          to="/"
          className="inline-flex items-center gap-3 font-display font-bold text-xl w-fit focus-ring rounded-lg"
        >
          <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center text-2xl" aria-hidden="true">
            🐄
          </span>
          <span>
            PawVita
            <span className="block text-xs font-normal text-white/60 -mt-0.5">
              Livestock Disease Surveillance
            </span>
          </span>
        </Link>

        <div className="max-w-md">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest font-display">
            {config ? config.title : "One network, two front doors"}
          </p>
          <h2 className="text-3xl font-display font-bold mt-3 leading-tight">
            {config
              ? config.tagline
              : "Early detection saves herds. Healthy herds sustain families."}
          </h2>
          <ul className="mt-8 space-y-3">
            {(config?.highlights ?? [
              "Village-level symptom reports reach a vet in minutes",
              "AI-assisted triage flags suspected outbreaks early",
              "District dashboards turn reports into containment",
            ]).map((line) => (
              <li key={line} className="flex items-start gap-3 text-white/80">
                <span className="text-amber-400 mt-0.5 shrink-0" aria-hidden="true">
                  <IconCheck />
                </span>
                <span className="text-sm leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {ASSURANCES.map(({ Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-xs text-white/50">
              <span aria-hidden="true">
                <Icon />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </aside>

      {/* Form column */}
      <main className="flex flex-col justify-center px-4 sm:px-8 py-10 lg:py-12">
        <div className="w-full max-w-md mx-auto">
          <Link
            to="/"
            className="lg:hidden inline-flex items-center gap-2.5 font-display font-bold text-[#1B4332] text-lg mb-8 focus-ring rounded-lg"
          >
            <span
              className="w-10 h-10 rounded-xl gradient-hero grid place-items-center text-xl"
              aria-hidden="true"
            >
              🐄
            </span>
            PawVita
          </Link>

          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 font-display">
            {eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#1B4332] mt-2 leading-tight">
            {title}
          </h1>
          <p className="text-gray-600 mt-2.5 leading-relaxed">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
