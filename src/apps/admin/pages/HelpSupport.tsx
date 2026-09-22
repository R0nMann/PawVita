import { Link } from "react-router";

/**
 * Operational help for administrators. Deliberately not the farmer/vet FAQ the
 * other portals show — the questions an administrator has are about accounts,
 * the region hierarchy and what to do when a service is down.
 */
const CONTACTS = [
  { icon: "📞", label: "Vet Helpline", value: "1800-180-0044", sub: "Toll free · 24/7", color: "bg-green-50 border-green-200" },
  { icon: "✉️", label: "Platform Support", value: "help@pawvita.in", sub: "Response in 24 hours", color: "bg-amber-50 border-amber-200" },
];

const TASKS = [
  {
    title: "Approving a staff registration",
    body: "Anyone registering as a vet, ward, lab or official account arrives as pending and sees a holding screen until approved. Open Users, check the organisation and region on the request, then approve or reject it.",
    to: "/admin/users",
    cta: "Open Users",
  },
  {
    title: "Adding districts, blocks and villages",
    body: "The hierarchy ships with every state and union territory, a couple of districts each and a sample of blocks and villages. Add rows by hand in Regions, or bulk-load a Local Government Directory extract through POST /admin/regions/import — it matches on code, so re-importing refreshes rather than duplicates.",
    to: "/admin/regions",
    cta: "Open Regions",
  },
  {
    title: "When a service reports down",
    body: "System Health probes the database and file storage on every load and shows the pending-account, open-case and offline-sync backlogs. A storage failure stops photo and voice uploads but leaves case reporting working; a database failure stops everything.",
    to: "/admin/system-health",
    cta: "Open System Health",
  },
  {
    title: "A report about a screen you cannot open",
    body: "Administrator accounts are confined to this console, so a vet or farmer screen cannot be opened from here. Ask the person for the case number and check the record through Users, or have someone holding that role reproduce it.",
    to: "/admin/users",
    cta: "Open Users",
  },
];

export default function HelpSupport() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Help &amp; Support</h1>
        <p className="text-gray-500 text-sm">Running the platform: accounts, regions and service health.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {CONTACTS.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-5 ${c.color}`}>
            <span className="text-2xl" aria-hidden="true">
              {c.icon}
            </span>
            <p className="font-display font-semibold text-gray-900 mt-2">{c.label}</p>
            <p className="text-sm text-gray-700">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {TASKS.map((t) => (
          <div key={t.title} className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <h2 className="font-display font-semibold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{t.body}</p>
            <Link
              to={t.to}
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-[#1B4332] hover:underline"
            >
              {t.cta} <span aria-hidden="true">→</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
