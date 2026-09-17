import { Link } from "react-router";
import { PORTAL_LIST } from "../../auth/portals";
import { OUTCOMES } from "../data/landing";
import { IconAlert, IconArrowRight, IconCheck } from "../components/Icons";

const GAPS = [
  {
    title: "Symptoms are reported late",
    body: "A farmer noticing lesions or a drop in milk yield often waits days before reaching a dispensary, by which time the herd — and neighbouring herds — are already exposed.",
  },
  {
    title: "Diagnostic facilities are distant",
    body: "Sample collection and laboratory referral depend on someone physically carrying material to a district lab, with no tracking in between.",
  },
  {
    title: "Records are incomplete",
    body: "Vaccination and treatment histories live in paper registers, so an animal's history is rarely available at the moment a decision is made.",
  },
  {
    title: "Information stays fragmented",
    body: "Farms, dispensaries, laboratories, vaccination drives and surveillance programmes each hold a piece of the picture, and nobody holds all of it.",
  },
];

const CAPABILITIES = [
  "Symptom and mortality capture from farmers and field workers",
  "Rule-based and AI-assisted triage that flags suspected outbreaks",
  "Geospatial risk mapping against weather and historical disease trends",
  "Animal-level and herd-level health, vaccination and treatment records",
  "Multilingual advisories and alerts across 22 Indian languages",
  "Sample collection, laboratory referral and case escalation",
  "Dashboards for district and state veterinary officials",
  "Mobile, web and offline-enabled channels for low-connectivity areas",
];

export default function About() {
  return (
    <>
      <header className="gradient-hero py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-amber-400 font-display font-semibold text-sm uppercase tracking-widest">
            About PashuRakshak
          </p>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-white mt-3 leading-tight text-balance">
            Safeguarding India&rsquo;s livestock economy
          </h1>
          <p className="text-white/75 text-lg mt-5 leading-relaxed max-w-prose">
            Livestock supports the income of more than 100 million rural households. When disease
            moves through a village undetected, it costs families their herds and their livelihood —
            and, in zoonotic cases, threatens human health too.
          </p>
        </div>
      </header>

      <section className="py-16 bg-white" aria-labelledby="problem-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="problem-heading"
            className="text-3xl font-display font-bold text-[#1B4332] text-balance"
          >
            The problem we are solving
          </h2>
          <p className="text-gray-600 text-lg mt-4 leading-relaxed max-w-prose">
            Livestock owners, field veterinarians, para-veterinary workers and government departments
            lack a unified, real-time way to see emerging animal-health risks at village, block and
            district level. Four gaps do most of the damage.
          </p>

          <ul className="grid sm:grid-cols-2 gap-5 mt-10">
            {GAPS.map((gap) => (
              <li key={gap.title} className="bg-[#FAF9F6] border border-[#E8E5DF] rounded-2xl p-6">
                <span className="text-[#E63946] text-xl" aria-hidden="true">
                  <IconAlert />
                </span>
                <h3 className="font-display font-bold text-[#1B4332] mt-3">{gap.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mt-2">{gap.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 bg-[#FAF9F6]" aria-labelledby="solution-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="solution-heading"
            className="text-3xl font-display font-bold text-[#1B4332] text-balance"
          >
            What the platform does
          </h2>
          <p className="text-gray-600 text-lg mt-4 leading-relaxed max-w-prose">
            A scalable animal-health surveillance and decision-support system, delivered through two
            connected portals.
          </p>

          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5 mt-8">
            {CAPABILITIES.map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#1B4332] mt-0.5 shrink-0" aria-hidden="true">
                  <IconCheck />
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <div className="grid md:grid-cols-2 gap-5 mt-12">
            {PORTAL_LIST.map((portal) => (
              <article key={portal.id} className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
                <span
                  className="inline-block text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: portal.accentSoft, color: portal.accent }}
                >
                  {portal.name}
                </span>
                <p className="text-gray-700 mt-3 leading-relaxed">{portal.tagline}</p>
                <Link
                  to={"/login?portal=" + portal.id}
                  className="inline-flex items-center gap-2 min-h-[44px] mt-3 font-semibold text-[#1B4332] rounded focus-ring"
                >
                  Open this portal <IconArrowRight />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white" aria-labelledby="impact-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="impact-heading" className="text-3xl font-display font-bold text-[#1B4332]">
            Impact goals
          </h2>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {OUTCOMES.map((item) => (
              <div key={item.label} className="border-l-4 border-amber-400 pl-4">
                <dt className="text-3xl font-display font-bold text-[#1B4332] tabular-nums">
                  {item.metric}
                </dt>
                <dd className="text-sm font-semibold text-gray-800 mt-1">{item.label}</dd>
                <dd className="text-xs text-gray-500 mt-1.5 leading-relaxed">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
