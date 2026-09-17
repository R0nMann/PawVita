import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PORTAL_LIST } from "../../auth/portals";
import {
  ACTIVE_CLUSTERS,
  DISEASE_TREND,
  JOURNEY,
  NETWORK_STATS,
  OUTCOMES,
  TESTIMONIALS,
} from "../data/landing";
import {
  IconArrowRight,
  IconCheck,
  IconGlobe,
  IconHospital,
  IconLeaf,
  IconWifiOff,
} from "../components/Icons";

const PORTAL_ICONS = { user: IconLeaf, hospital: IconHospital } as const;

export default function Landing() {
  return (
    <>
      <Hero />
      <NetworkStats />
      <PortalGateway />
      <Journey />
      <LiveClusters />
      <Outcomes />
      <Testimonials />
      <ClosingCta />
    </>
  );
}

/* ---------------------------------------------------------------- hero ---- */

function Hero() {
  return (
    <section className="gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute -top-10 left-10 w-72 h-72 bg-amber-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-400 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <p className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/30 rounded-full px-4 py-1.5 mb-6">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="text-amber-400 text-xs font-semibold tracking-widest uppercase">
              AI-assisted surveillance active
            </span>
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-[1.08] text-balance">
            Protecting India&rsquo;s <span className="text-amber-400">livestock</span>, one report at
            a time
          </h1>

          <p className="text-white/75 text-lg leading-relaxed mt-6 max-w-prose">
            One surveillance network for the people who spot disease first and the institutions that
            contain it. Farmers and field workers report symptoms; veterinary hospitals, laboratories
            and district officials act on them within hours.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 min-h-[52px] px-7 rounded-xl bg-amber-400 text-[#0F2D1F] font-bold font-display text-base hover:bg-amber-300 transition-colors focus-ring"
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

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {[
              { Icon: IconCheck, label: "Free for farmers" },
              { Icon: IconWifiOff, label: "Works offline" },
              { Icon: IconGlobe, label: "22 languages" },
            ].map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-white/70 text-sm">
                <span className="text-amber-400" aria-hidden="true">
                  <Icon />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-dark rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-white font-display font-semibold text-sm">
              Disease trend — last 7 months
            </h2>
            <span className="text-[11px] text-emerald-300 bg-emerald-400/15 px-2.5 py-1 rounded-full shrink-0">
              Live data
            </span>
          </div>

          <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={DISEASE_TREND} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="landing-fmd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F4A300" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F4A300" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="landing-lsd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6AAEE8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6AAEE8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#0F2D1F",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="FMD"
                  stroke="#F4A300"
                  fill="url(#landing-fmd)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="LSD"
                  stroke="#6AAEE8"
                  fill="url(#landing-lsd)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Text alternative — a chart alone is not reachable by screen readers. */}
          <p className="sr-only">
            Foot-and-mouth disease cases rose from 42 in July to 71 in January, peaking after a dip in
            November. Lumpy skin disease fell from a September high of 31 to 15 in January.
          </p>

          <ul className="grid grid-cols-3 gap-2.5 mt-4">
            {ACTIVE_CLUSTERS.map((cluster) => (
              <li key={cluster.id} className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-[11px] truncate">{cluster.district}</p>
                <p className="text-white font-display font-bold text-sm mt-0.5">
                  {cluster.disease.split(" ")[0]}
                </p>
                <p
                  className={`text-[11px] mt-1 font-semibold ${
                    cluster.confidence >= 85
                      ? "text-red-300"
                      : cluster.confidence >= 75
                        ? "text-amber-300"
                        : "text-emerald-300"
                  }`}
                >
                  {cluster.confidence}% confidence
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- stats ---- */

function AnimatedStat({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const duration = 900;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // Ease-out so the number decelerates into its final value.
          setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  const formatted =
    shown >= 1_000_000
      ? (shown / 1_000_000).toFixed(1) + "M"
      : shown >= 1000
        ? Math.round(shown / 1000) + "K"
        : String(shown);

  return (
    <div className="text-center">
      <p ref={ref} className="text-3xl md:text-4xl font-display font-bold text-white tabular-nums">
        {formatted}
        {suffix}
      </p>
      <p className="text-white/60 text-sm mt-1">{label}</p>
    </div>
  );
}

function NetworkStats() {
  return (
    <section className="bg-[#1B4332] py-14" aria-label="Network at a glance">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        <AnimatedStat value={NETWORK_STATS.registeredFarmers} label="Registered farmers" />
        <AnimatedStat value={NETWORK_STATS.activeCases} label="Active cases" />
        <AnimatedStat value={NETWORK_STATS.outbreaksControlled} label="Outbreaks controlled" />
        <AnimatedStat value={NETWORK_STATS.vaccinationCoverage} suffix="%" label="Vaccination coverage" />
        <AnimatedStat value={NETWORK_STATS.animalsTracked} label="Animals tracked" />
        <AnimatedStat value={NETWORK_STATS.vetOfficers} label="Vet officers" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- gateway ---- */

/** The "I am a..." path selection that joins the two applications. */
function PortalGateway() {
  return (
    <section className="py-20 bg-[#FAF9F6]" aria-labelledby="gateway-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-amber-600 font-display font-semibold text-sm uppercase tracking-widest">
            Two front doors
          </p>
          <h2
            id="gateway-heading"
            className="text-3xl sm:text-4xl font-display font-bold text-[#1B4332] mt-2 text-balance"
          >
            One network, entered from wherever you work
          </h2>
          <p className="text-gray-600 text-lg mt-4 leading-relaxed">
            Choose a portal to sign in. Everything you report on one side is visible to the people
            responding on the other.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {PORTAL_LIST.map((portal) => {
            const Icon = PORTAL_ICONS[portal.id];
            return (
              <article
                key={portal.id}
                className="bg-white rounded-3xl border border-[#E8E5DF] p-7 sm:p-8 flex flex-col shadow-card hover:shadow-card-hover transition-shadow"
              >
                <span
                  className="w-14 h-14 rounded-2xl grid place-items-center text-2xl"
                  style={{ background: portal.accentSoft, color: portal.accent }}
                  aria-hidden="true"
                >
                  <Icon />
                </span>

                <h3 className="text-2xl font-display font-bold text-[#1B4332] mt-5">{portal.name}</h3>
                <p className="text-gray-600 mt-2 leading-relaxed">{portal.tagline}</p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {portal.highlights.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="mt-0.5 shrink-0" style={{ color: portal.accent }} aria-hidden="true">
                        <IconCheck />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>

                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-7 mb-2.5">
                  Roles in this portal
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {portal.roles.map((role) => (
                    <li
                      key={role.id}
                      className="text-xs font-medium text-gray-700 bg-[#FAF9F6] border border-[#E8E5DF] rounded-full px-2.5 py-1"
                    >
                      {role.short}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3 mt-7">
                  <Link
                    to={"/login?portal=" + portal.id}
                    className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl text-white font-semibold font-display transition-opacity hover:opacity-90 focus-ring"
                    style={{ background: portal.accent }}
                  >
                    Sign in <IconArrowRight />
                    <span className="sr-only">to the {portal.name} portal</span>
                  </Link>
                  <Link
                    to={"/register?portal=" + portal.id}
                    className="inline-flex items-center min-h-[48px] px-6 rounded-xl border border-[#E8E5DF] text-gray-700 font-semibold hover:bg-[#FAF9F6] transition-colors focus-ring"
                  >
                    Register
                    <span className="sr-only"> for the {portal.name} portal</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- journey ---- */

function Journey() {
  return (
    <section className="py-20 bg-white" aria-labelledby="journey-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[#1B4332] font-display font-semibold text-sm uppercase tracking-widest">
            Report to containment
          </p>
          <h2
            id="journey-heading"
            className="text-3xl sm:text-4xl font-display font-bold text-[#1B4332] mt-2 text-balance"
          >
            From a symptom in a village to a district response
          </h2>
        </div>

        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {JOURNEY.map((stage) => (
            <li
              key={stage.step}
              className="bg-[#FAF9F6] rounded-2xl p-6 border border-[#E8E5DF] h-full"
            >
              <p className="text-xs font-display font-bold tracking-widest text-amber-600">
                STEP {stage.step}
              </p>
              <h3 className="font-display font-bold text-lg text-[#1B4332] mt-2">{stage.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mt-2">{stage.desc}</p>
            </li>
          ))}
        </ol>

        <p className="text-center mt-10">
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-2 min-h-[44px] text-[#1B4332] font-semibold rounded focus-ring"
          >
            See the full journey <IconArrowRight />
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ clusters ---- */

const TREND_STYLE = {
  rising: { cls: "bg-red-100 text-red-700", label: "Rising" },
  stable: { cls: "bg-amber-100 text-amber-800", label: "Stable" },
  declining: { cls: "bg-emerald-100 text-emerald-700", label: "Declining" },
} as const;

function LiveClusters() {
  return (
    <section className="py-20 bg-[#FAF9F6]" aria-labelledby="clusters-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-[#E63946] font-display font-semibold text-sm uppercase tracking-widest">
            AI monitoring
          </p>
          <h2
            id="clusters-heading"
            className="text-3xl font-display font-bold text-[#1B4332] mt-1.5"
          >
            Active outbreak clusters
          </h2>
        </div>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ACTIVE_CLUSTERS.map((cluster) => {
            const trend = TREND_STYLE[cluster.trend];
            return (
              <li
                key={cluster.id}
                className="bg-white rounded-2xl p-5 border border-[#E8E5DF] shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-[#1B4332]">{cluster.disease}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {cluster.district}, {cluster.state}
                    </p>
                  </div>
                  <span
                    className={`w-12 h-12 shrink-0 rounded-xl grid place-items-center text-white text-sm font-display font-bold tabular-nums ${
                      cluster.confidence >= 85
                        ? "bg-[#E63946]"
                        : cluster.confidence >= 75
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                    }`}
                  >
                    {cluster.confidence}%<span className="sr-only"> confidence</span>
                  </span>
                </div>

                <dl className="flex items-center gap-5 text-sm text-gray-600 mt-4">
                  <div className="flex items-baseline gap-1.5">
                    <dt className="sr-only">Cases</dt>
                    <dd className="font-semibold text-gray-900 tabular-nums">{cluster.casesCount}</dd>
                    <span className="text-gray-500">cases</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <dt className="sr-only">Radius</dt>
                    <dd className="font-semibold text-gray-900 tabular-nums">~{cluster.radius} km</dd>
                    <span className="text-gray-500">radius</span>
                  </div>
                </dl>

                <p className="flex items-center gap-2 mt-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trend.cls}`}>
                    {trend.label}
                  </span>
                  <span className="text-xs text-gray-500">Updated {cluster.lastUpdated}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ outcomes ---- */

function Outcomes() {
  return (
    <section className="py-16 bg-white" aria-labelledby="outcomes-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="outcomes-heading"
          className="text-3xl font-display font-bold text-[#1B4332] text-center text-balance"
        >
          What a full surveillance cycle changes
        </h2>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
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
  );
}

/* -------------------------------------------------------- testimonials ---- */

function Testimonials() {
  return (
    <section className="py-20 bg-[#1B4332]" aria-labelledby="testimonials-heading">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="testimonials-heading"
          className="text-3xl font-display font-bold text-white text-center text-balance"
        >
          Trusted by farmers and officials across India
        </h2>
        <ul className="grid md:grid-cols-3 gap-6 mt-12">
          {TESTIMONIALS.map((item) => (
            <li key={item.name} className="glass-dark rounded-2xl p-6">
              <figure className="h-full flex flex-col">
                <blockquote className="text-white/80 text-sm leading-relaxed flex-1">
                  “{item.quote}”
                </blockquote>
                <figcaption className="flex items-center gap-3 mt-5">
                  <span
                    className="w-9 h-9 shrink-0 rounded-full bg-amber-400 text-[#0F2D1F] font-display font-bold grid place-items-center"
                    aria-hidden="true"
                  >
                    {item.avatar}
                  </span>
                  <span>
                    <span className="block text-white font-semibold text-sm">{item.name}</span>
                    <span className="block text-white/50 text-xs">
                      {item.role} · {item.location}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ final cta --- */

function ClosingCta() {
  return (
    <section className="py-20 bg-amber-400">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-[#0F2D1F] text-balance">
          Ready to protect your herd?
        </h2>
        <p className="text-[#0F2D1F]/75 text-lg mt-4 leading-relaxed">
          Registration is free for farmers and field workers, and takes under a minute on any phone.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            to="/register?portal=user"
            className="inline-flex items-center gap-2 min-h-[52px] px-7 rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#0F2D1F] transition-colors focus-ring"
          >
            Register as a livestock owner <IconArrowRight />
          </Link>
          <Link
            to="/register?portal=hospital"
            className="inline-flex items-center min-h-[52px] px-7 rounded-xl border-2 border-[#1B4332] text-[#1B4332] font-bold font-display hover:bg-[#1B4332]/10 transition-colors focus-ring"
          >
            Register an institution
          </Link>
        </div>
      </div>
    </section>
  );
}
