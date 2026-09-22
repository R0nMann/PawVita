import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { errorMessage } from "../../api/client";
import { authApi } from "../../api/endpoints";
import type { Region } from "../../api/types";
import { useAuth, homeFor } from "../../auth/AuthContext";
import { PORTALS, PORTAL_LIST, roleFor } from "../../auth/portals";
import type { PortalId } from "../../auth/portals";
import { LANGUAGES } from "../../lib/format";
import RegionPicker from "../ui/RegionPicker";
import AuthShell from "../components/AuthShell";
import PortalChoice from "../components/PortalChoice";
import RolePicker from "../components/RolePicker";
import { IconAlert, IconArrowRight, IconCheck } from "../components/Icons";

interface FieldErrors {
  name?: string;
  contact?: string;
  password?: string;
  region?: string;
}

const STEPS = ["Portal", "Role", "Details"] as const;

/** Administrator accounts are created by other administrators, never here. */
const JOINABLE_PORTALS = PORTAL_LIST.filter((p) => p.roles.some((r) => r.selfService));

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { completeSignIn } = useAuth();

  const requested = params.get("portal");
  const initialPortal: PortalId = requested === "hospital" || requested === "user" ? requested : "user";

  const [step, setStep] = useState(requested ? 1 : 0);
  const [portal, setPortal] = useState<PortalId>(initialPortal);
  const [roleId, setRoleId] = useState(PORTALS[initialPortal].roles[0]!.id);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [region, setRegion] = useState<Region | null>(null);
  const [language, setLanguage] = useState("hi");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [otp, setOtp] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formId = useId();

  const config = PORTALS[portal];
  const role = roleFor(portal, roleId);
  const isVillageRole = role.backendRole === "farmer" || role.backendRole === "field_worker";
  const errorList = Object.entries(errors) as [keyof FieldErrors, string][];

  // A summary is focused after a failed submit; inline errors stay on each field.
  useEffect(() => {
    if (errorList.length || submitError) summaryRef.current?.focus();
  }, [errors, submitError]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function choosePortal(id: PortalId) {
    setPortal(id);
    setRoleId(PORTALS[id].roles[0]!.id);
  }

  function validate(): boolean {
    const found: FieldErrors = {};
    if (name.trim().length < 2) found.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(contact.trim())) found.contact = "Enter a valid email address.";
    if (password.length < 8) found.password = "Use a password of at least 8 characters.";
    if (isVillageRole && (!region || !["village", "block", "district"].includes(region.level))) {
      found.region = "Choose your village so reports reach the right vet.";
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setSubmitError(null);
    try {
      await fn();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    void run(async () => {
      const result = await authApi.register({
        email: contact.trim(),
        password,
        fullName: name.trim(),
        role: role.backendRole,
        username: username.trim() || undefined,
        organizationCode: orgCode.trim() || undefined,
        regionId: region?.id,
        preferredLanguage: language,
      });
      if (result.session) {
        const session = completeSignIn(result.session, result.user, portal);
        navigate(homeFor(session), { replace: true });
      } else {
        setConfirmEmail(true);
      }
    });
  }

  const titles = [
    "Create your PawVita account",
    "Tell us what you do",
    "Your account",
  ];
  const subtitles = [
    "Registration takes under a minute and is free for farmers and field workers.",
    "Your role decides which dashboard opens after you register.",
    "We use your village to route reports to the nearest veterinary response team.",
  ];

  const inputClass =
    "w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring";
  const primaryClass =
    "flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#2D6A4F] transition-colors focus-ring disabled:opacity-60";

  if (confirmEmail) {
    return (
      <AuthShell portal={portal} eyebrow="Almost there" title="Check your email" subtitle="Confirm your address, then sign in.">
        <p className="text-sm text-gray-600">
          We sent a confirmation link to <span className="font-semibold">{contact}</span>. After confirming, sign in with
          your email or staff ID. An administrator will approve your account before you can see cases.
        </p>
        <Link to={"/login?portal=" + portal} className={primaryClass + " mt-6 w-full"}>
          Go to sign in <IconArrowRight />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      portal={step === 0 ? null : portal}
      eyebrow={"Step " + (step + 1) + " of 3"}
      title={titles[step]!}
      subtitle={subtitles[step]!}
    >
      <ol className="flex items-center gap-2 mb-7" aria-label="Registration progress">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "upcoming";
          return (
            <li key={label} className="flex-1 flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-xs font-bold transition-colors ${
                  state === "done"
                    ? "bg-[#1B4332] text-white"
                    : state === "current"
                      ? "bg-amber-400 text-[#0F2D1F]"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {state === "done" ? <IconCheck /> : i + 1}
              </span>
              <span
                className={`text-xs font-semibold ${state === "upcoming" ? "text-gray-400" : "text-gray-700"}`}
              >
                {label}
                {state === "current" && <span className="sr-only"> (current step)</span>}
              </span>
              {i < STEPS.length - 1 && <span className="flex-1 h-px bg-gray-200" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="sr-only" aria-live="polite">
        {titles[step]}
      </h2>

      {step === 0 && (
        <div>
          <PortalChoice
            value={portal}
            onChange={choosePortal}
            name={formId + "-portal"}
            portals={JOINABLE_PORTALS}
            legend="Are you registering as a livestock owner or an institution?"
          />
          <button type="button" onClick={() => setStep(1)} className={primaryClass + " w-full mt-6"}>
            Continue <IconArrowRight />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <RolePicker portal={portal} value={roleId} onChange={setRoleId} id={formId + "-role"} selfServiceOnly />
          <div className="rounded-2xl bg-[#FAF9F6] border border-[#E8E5DF] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
              What you will get
            </p>
            <ul className="space-y-2">
              {config.highlights.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="text-[#1B4332] mt-0.5 shrink-0" aria-hidden="true">
                    <IconCheck />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 min-h-[48px] rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors focus-ring"
            >
              Back
            </button>
            <button type="button" onClick={() => setStep(2)} className={primaryClass}>
              Continue <IconArrowRight />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (errorList.length > 0 || submitError) && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mb-5 rounded-xl border border-[#E63946]/30 bg-[#FEE2E2] px-4 py-3 outline-none"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-[#991B1B]">
            <span aria-hidden="true">
              <IconAlert />
            </span>
            {submitError ?? `Please fix ${errorList.length} ${errorList.length === 1 ? "field" : "fields"}`}
          </p>
          {errorList.length > 0 && (
            <ul className="mt-2 space-y-1 pl-6 list-disc">
              {errorList.map(([field, message]) => (
                <li key={field}>
                  <a
                    href={"#" + formId + "-" + field}
                    className="text-sm text-[#991B1B] underline underline-offset-2 rounded focus-ring"
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Field id={formId + "-name"} label="Full name" error={errors.name}>
            <input
              id={formId + "-name"}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ramesh Kumar"
              aria-invalid={errors.name ? true : undefined}
              className={inputClass}
            />
          </Field>

          <Field
            id={formId + "-contact"}
            label="Email address"
            error={errors.contact}
            help="You sign in with this, and it is where your sign-in code goes."
          >
            <input
              id={formId + "-contact"}
              type="email"
              autoComplete="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="name@example.in"
              aria-invalid={errors.contact ? true : undefined}
              className={inputClass}
            />
          </Field>

          {(
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id={formId + "-password"} label="Password" error={errors.password} help="At least 8 characters.">
                <input
                  id={formId + "-password"}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={errors.password ? true : undefined}
                  className={inputClass}
                />
              </Field>
              <Field id={formId + "-username"} label="Staff ID (optional)" help="Sign in with this instead of email.">
                <input
                  id={formId + "-username"}
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="dr.priya"
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          <div id={formId + "-region"}>
            <RegionPicker onChange={setRegion} deepest={isVillageRole ? "village" : "district"} />
            {errors.region && (
              <p className="text-sm text-[#B91C1C] mt-2 flex items-center gap-1.5">
                <span aria-hidden="true">
                  <IconAlert />
                </span>
                {errors.region}
              </p>
            )}
          </div>

          {!isVillageRole && (
            <Field
              id={formId + "-org"}
              label="Hospital / lab / department code (optional)"
              help="Ask your institution for its PawVita code, e.g. vh-pune-01."
            >
              <input
                id={formId + "-org"}
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toLowerCase())}
                placeholder="vh-pune-01"
                className={inputClass}
              />
            </Field>
          )}

          <div>
            <label htmlFor={formId + "-lang"} className="block text-sm font-semibold text-gray-700 mb-2">
              Preferred language
            </label>
            <select
              id={formId + "-lang"}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-describedby={formId + "-lang-help"}
              className={inputClass}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} — {l.native}
                </option>
              ))}
            </select>
            <p id={formId + "-lang-help"} className="text-xs text-gray-500 mt-2">
              Advisories and outbreak alerts will be sent in this language.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 min-h-[48px] rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors focus-ring"
            >
              Back
            </button>
            <button type="submit" disabled={busy} className={primaryClass}>
              {busy ? "Please wait…" : "Create account"}
              {!busy && <IconArrowRight />}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
        Already registered?{" "}
        <Link
          to={"/login?portal=" + portal}
          className="text-[#1B4332] font-semibold underline underline-offset-2 rounded focus-ring"
        >
          Sign in here
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({
  id,
  label,
  error,
  help,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      {children}
      {help && <p className="text-xs text-gray-500 mt-2">{help}</p>}
      {error && (
        <p id={id + "-error"} className="text-sm text-[#B91C1C] mt-2 flex items-center gap-1.5">
          <span aria-hidden="true">
            <IconAlert />
          </span>
          {error}
        </p>
      )}
    </div>
  );
}
