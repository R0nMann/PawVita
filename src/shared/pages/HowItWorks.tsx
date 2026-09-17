import { Link } from "react-router";
import { JOURNEY } from "../data/landing";
import {
  IconActivity,
  IconArrowRight,
  IconBell,
  IconFlask,
  IconGlobe,
  IconHospital,
  IconMapPin,
  IconPhone,
  IconWifiOff,
} from "../components/Icons";

const STAGE_DETAIL = [
  {
    actor: "Livestock Owner Portal",
    Icon: IconActivity,
    handoff: "A case id is created and pushed to the nearest veterinary hospital queue.",
  },
  {
    actor: "Triage engine",
    Icon: IconBell,
    handoff: "High-confidence matches raise an alert for the district before a vet has even arrived.",
  },
  {
    actor: "Veterinary Hospital Portal",
    Icon: IconHospital,
    handoff: "Samples are logged, referred to the district laboratory and tracked to a result.",
  },
  {
    actor: "Government dashboards",
    Icon: IconMapPin,
    handoff: "Advisories go back out to every farmer inside the cluster radius, in their language.",
  },
];

const CHANNELS = [
  {
    Icon: IconPhone,
    title: "Mobile and IVR",
    body: "A guided, icon-based form on a smartphone — or a toll-free IVR call for anyone on a feature phone.",
  },
  {
    Icon: IconWifiOff,
    title: "Offline first",
    body: "Reports are stored on the device in low-connectivity villages and sync automatically when signal returns.",
  },
  {
    Icon: IconGlobe,
    title: "22 languages",
    body: "Symptom labels, advisories and alerts are issued in the language the recipient registered in.",
  },
  {
    Icon: IconFlask,
    title: "Laboratory integration",
    body: "Sample collection, referral and diagnostic results flow back into the same case record.",
  },
];

export default function HowItWorks() {
  return (
    <>
      <header className="gradient-hero py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-amber-400 font-display font-semibold text-sm uppercase tracking-widest">
            How it works
          </p>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-white mt-3 leading-tight text-balance">
            From first symptom to safe resolution
          </h1>
          <p className="text-white/75 text-lg mt-5 leading-relaxed max-w-prose">
            Four stages, two portals, one case record. Here is what happens between a farmer noticing
            something wrong and a district issuing a containment advisory.
          </p>
        </div>
      </header>

      <section className="py-16 bg-white" aria-labelledby="stages-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="stages-heading" className="sr-only">
            The four stages of a case
          </h2>

          <ol className="space-y-5">
            {JOURNEY.map((stage, i) => {
              const detail = STAGE_DETAIL[i];
              const Icon = detail.Icon;
              return (
                <li
                  key={stage.step}
                  className="bg-[#FAF9F6] border border-[#E8E5DF] rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row gap-5"
                >
                  <span
                    className="w-12 h-12 shrink-0 rounded-2xl bg-[#1B4332] text-white grid place-items-center text-xl"
                    aria-hidden="true"
                  >
                    <Icon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-display font-bold tracking-widest text-amber-600">
                      STEP {stage.step} · {detail.actor}
                    </p>
                    <h3 className="text-xl font-display font-bold text-[#1B4332] mt-1.5">
                      {stage.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mt-2">{stage.desc}</p>
                    <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-[#E8E5DF]">
                      <span className="font-semibold text-[#1B4332]">Handoff: </span>
                      {detail.handoff}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="py-16 bg-[#FAF9F6]" aria-labelledby="channels-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="channels-heading"
            className="text-3xl font-display font-bold text-[#1B4332] text-balance"
          >
            Built for places with patchy signal
          </h2>
          <p className="text-gray-600 text-lg mt-4 leading-relaxed max-w-prose">
            Early warning only works if the first report actually gets through. Every channel below
            feeds the same case record.
          </p>

          <ul className="grid sm:grid-cols-2 gap-5 mt-10">
            {CHANNELS.map(({ Icon, title, body }) => (
              <li key={title} className="bg-white border border-[#E8E5DF] rounded-2xl p-6">
                <span className="text-[#4A90D9] text-2xl" aria-hidden="true">
                  <Icon />
                </span>
                <h3 className="font-display font-bold text-[#1B4332] mt-3">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mt-2">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 bg-[#1B4332]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-display font-bold text-white text-balance">
            Join the network
          </h2>
          <p className="text-white/70 text-lg mt-4 leading-relaxed">
            Over 4,800 veterinarians and officials already work inside PashuRakshak alongside a
            quarter of a million registered farmers.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 min-h-[52px] px-7 rounded-xl bg-amber-400 text-[#0F2D1F] font-bold font-display hover:bg-amber-300 transition-colors focus-ring"
            >
              Create an account <IconArrowRight />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center min-h-[52px] px-7 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors focus-ring"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
