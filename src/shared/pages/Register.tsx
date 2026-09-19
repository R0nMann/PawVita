import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { errorMessage } from "../../api/client";
import { authApi } from "../../api/endpoints";
import type { AuthTokens, Region } from "../../api/types";
import { useAuth, homeFor } from "../../auth/AuthContext";
import { DEMO_ENABLED, DEMO_OTP } from "../../auth/demo";
import { PORTALS, roleFor } from "../../auth/portals";
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

/** Set by the sign-in page when a phone verified an OTP but has no account yet. */
interface VerifiedPhone {
  phone: string;
  tokens: AuthTokens;
}

const STEPS = ["Portal", "Role", "Details"] as const;

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { completeSignIn } = useAuth();

  const verified = (location.state as { verified?: VerifiedPhone } | null)?.verified ?? null;
  const requested = params.get("portal");
  const initialPortal: PortalId = verified
    ? "user"
    : requested === "hospital" || requested === "user"
      ? requested
      : "user";

  const [step, setStep] = useState(requested || verified ? 1 : 0);
  const [portal, setPortal] = useState<PortalId>(initialPortal);
  const [roleId, setRoleId] = useState(PORTALS[initialPortal].roles[0]!.id);
  const [name, setName] = useState("");
  const [contact, setContact] = useState(verified?.phone ?? "");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [region, setRegion] = useState<Region | null>(null);
  const [language, setLanguage] = useState("hi");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Phone registration: the OTP step and the verified session it produces.
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formId = useId();

  const config = PORTALS[portal];
  const role = roleFor(portal, roleId);
  const isOtpPortal = config.authMethod === "otp";
  const isVillageRole = role.backendRole === "farmer" || role.backendRole === "field_worker";
  const errorList = Object.entries(errors) as [keyof FieldErrors, string][];

  // A summary is focused after a failed submit; inline errors stay on each field.
  useEffect(() => {
    if (errorList.length || submitError) summaryRef.current?.focus();
  }, [errors, submitError]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, otpStep]);

  function choosePortal(id: PortalId) {
    setPortal(id);
    setRoleId(PORTALS[id].roles[0]!.id);
  }

  function validate(): boolean {
    const found: FieldErrors = {};
    if (name.trim().length < 2) found.name = "Enter your full name.";
    if (isOtpPortal) {
      if (!/^\d{10}$/.test(contact)) found.contact = "Enter a 10-digit mobile number.";
    } else {
      if (!/^\S+@\S+\.\S+$/.test(contact.trim())) found.contact = "Enter a valid official email address.";
      if (password.length < 8) found.password = "Use a password of at least 8 characters.";
    }
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

  /** Create the account for a phone that has just been verified. */
  async function registerVerifiedPhone(tokens: AuthTokens) {
    const { user } = await authApi.registerPhone(tokens.accessToken, {
      fullName: name.trim(),
      role: role.backendRole,
      regionId: region?.id,
      preferredLanguage: language,
      organizationCode: orgCode.trim() || undefined,
    });
    const session = completeSignIn(tokens, user, portal);
    navigate(homeFor(session), { replace: true });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isOtpPortal) {
      void run(async () => {
        if (verified) return registerVerifiedPhone(verified.tokens);
        await authApi.requestOtp(contact);
        setOtpStep(true);
      });
      return;
    }

    void run(async () => {
      const result = await authApi.registerStaff({
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

  function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) {
      setSubmitError("Enter the OTP sent to your mobile number.");
      return;
    }
    void run(async () => {
      const result = await authApi.verifyOtp(contact, otp);
      if (result.user) {
        // Already registered (or registered by a field worker): just sign in.
        const session = completeSignIn(result.session, result.user, portal);
        navigate(homeFor(session), { replace: true });
        return;
      }
      await registerVerifiedPhone(result.session);
    });
  }

  const titles = [
    "Create your PawVita account",
    "Tell us what you do",
    otpStep ? "Verify your mobile number" : isOtpPortal ? "Your details" : "Your account",
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

      {verified && step > 0 && (
        <p className="mb-5 rounded-xl bg-[#E8F1EC] px-4 py-3 text-sm text-[#1B4332]">
          +91 {verified.phone} is verified. Finish your details to create the account.
        </p>
      )}

      {step === 0 && (
        <div>
          <PortalChoice
            value={portal}
            onChange={choosePortal}
            name={formId + "-portal"}
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
            {!verified && (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex-1 min-h-[48px] rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors focus-ring"
              >
                Back
              </button>
            )}
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

      {step === 2 && otpStep && (
        <form onSubmit={handleOtp} noValidate className="space-y-5">
          <p className="text-sm text-gray-600">
            OTP sent to <span className="font-semibold text-gray-900">+91 {contact}</span>.{" "}
            <button
              type="button"
              onClick={() => setOtpStep(false)}
              className="text-[#1B4332] font-semibold underline underline-offset-2 rounded focus-ring"
            >
              Change details
            </button>
          </p>
          <div>
            <label htmlFor={formId + "-otp"} className="block text-sm font-semibold text-gray-700 mb-2">
              One-time password
            </label>
            <input
              id={formId + "-otp"}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 text-center text-2xl tracking-[0.4em] bg-[#FAF9F6] focus-ring"
            />
            {DEMO_ENABLED && (
              <p className="text-xs text-gray-500 mt-2 text-center">Demo build — the demo OTP is {DEMO_OTP}.</p>
            )}
          </div>
          <button type="submit" disabled={busy} className={primaryClass + " w-full"}>
            {busy ? "Creating account…" : "Verify and create account"} {!busy && <IconArrowRight />}
          </button>
        </form>
      )}

      {step === 2 && !otpStep && (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Field id={formId + "-name"} label="Full name" error={errors.name}>
            <input
              id={formId + "-name"}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isOtpPortal ? "Ramesh Kumar" : "Dr. Priya Sharma"}
              aria-invalid={errors.name ? true : undefined}
              className={inputClass}
            />
          </Field>

          <Field
            id={formId + "-contact"}
            label={isOtpPortal ? "Mobile number" : "Official email"}
            error={errors.contact}
            help={isOtpPortal ? "Used for OTP sign-in and outbreak alerts." : undefined}
          >
            {isOtpPortal ? (
              <div className="flex">
                <span className="px-3 grid place-items-center bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-gray-600 text-sm">
                  +91
                </span>
                <input
                  id={formId + "-contact"}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={contact}
                  readOnly={!!verified}
                  onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  aria-invalid={errors.contact ? true : undefined}
                  className="flex-1 min-w-0 min-h-[48px] border border-gray-200 rounded-r-xl px-4 text-base bg-[#FAF9F6] focus-ring read-only:text-gray-500"
                />
              </div>
            ) : (
              <input
                id={formId + "-contact"}
                type="email"
                autoComplete="email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="registrar@pawvita.in"
                aria-invalid={errors.contact ? true : undefined}
                className={inputClass}
              />
            )}
          </Field>

          {!isOtpPortal && (
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
              {busy ? "Please wait…" : isOtpPortal && !verified ? "Send OTP" : "Create account"}
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
