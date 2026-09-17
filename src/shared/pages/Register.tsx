import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { PORTALS, roleFor } from "../../auth/portals";
import type { PortalId } from "../../auth/portals";
import AuthShell from "../components/AuthShell";
import PortalChoice from "../components/PortalChoice";
import RolePicker from "../components/RolePicker";
import { IconAlert, IconArrowRight, IconCheck } from "../components/Icons";

const STATES = [
  "Maharashtra",
  "Gujarat",
  "Rajasthan",
  "Punjab",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Karnataka",
  "Tamil Nadu",
];

const LANGUAGES = ["Hindi", "English", "Marathi", "Gujarati", "Punjabi", "Tamil", "Telugu", "Bengali"];

interface FieldErrors {
  name?: string;
  contact?: string;
  district?: string;
}

const STEPS = ["Portal", "Role", "Details"] as const;

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signIn } = useAuth();

  const requested = params.get("portal");
  const initialPortal: PortalId =
    requested === "hospital" || requested === "user" ? requested : "user";

  const [step, setStep] = useState(requested ? 1 : 0);
  const [portal, setPortal] = useState<PortalId>(initialPortal);
  const [roleId, setRoleId] = useState(PORTALS[initialPortal].roles[0].id);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [stateName, setStateName] = useState(STATES[0]);
  const [district, setDistrict] = useState("");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [errors, setErrors] = useState<FieldErrors>({});

  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formId = useId();

  const config = PORTALS[portal];
  const isOtpPortal = config.authMethod === "otp";
  const errorList = Object.entries(errors) as [keyof FieldErrors, string][];

  // A summary is focused after a failed submit; inline errors stay on each field.
  useEffect(() => {
    if (errorList.length) summaryRef.current?.focus();
  }, [errors]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function choosePortal(id: PortalId) {
    setPortal(id);
    setRoleId(PORTALS[id].roles[0].id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found: FieldErrors = {};

    if (name.trim().length < 2) {
      found.name = isOtpPortal
        ? "Enter your full name as it appears on your records."
        : "Enter the registered name of your institution.";
    }
    if (isOtpPortal) {
      if (!/^\d{10}$/.test(contact)) found.contact = "Enter a 10-digit mobile number.";
    } else if (!/^\S+@\S+\.\S+$/.test(contact.trim())) {
      found.contact = "Enter a valid official email address.";
    }
    if (district.trim().length < 2) found.district = "Enter your district.";

    setErrors(found);
    if (Object.keys(found).length) return;

    const created = signIn({
      portal,
      role: roleId,
      name: name.trim(),
      identifier: isOtpPortal ? "+91 " + contact : contact.trim(),
      district: district.trim() + ", " + stateName,
      language,
    });
    navigate(roleFor(created.portal, created.role).home, { replace: true });
  }

  const titles = [
    "Create your PawVita account",
    "Tell us what you do",
    isOtpPortal ? "Your details" : "Your institution",
  ];
  const subtitles = [
    "Registration takes under a minute and is free for farmers and field workers.",
    "Your role decides which dashboard opens after you register.",
    "We use your district to route reports to the nearest veterinary response team.",
  ];

  return (
    <AuthShell
      portal={step === 0 ? null : portal}
      eyebrow={"Step " + (step + 1) + " of 3"}
      title={titles[step]}
      subtitle={subtitles[step]}
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
            legend="Are you registering as a livestock owner or an institution?"
          />
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full mt-6 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#2D6A4F] transition-colors focus-ring"
          >
            Continue <IconArrowRight />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <RolePicker portal={portal} value={roleId} onChange={setRoleId} id={formId + "-role"} />
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
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#2D6A4F] transition-colors focus-ring"
            >
              Continue <IconArrowRight />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {errorList.length > 0 && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-[#E63946]/30 bg-[#FEE2E2] px-4 py-3 outline-none"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-[#991B1B]">
                <span aria-hidden="true">
                  <IconAlert />
                </span>
                Please fix {errorList.length} {errorList.length === 1 ? "field" : "fields"}
              </p>
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
            </div>
          )}

          <Field
            id={formId + "-name"}
            anchorId={formId + "-name"}
            label={isOtpPortal ? "Full name" : "Institution name"}
            error={errors.name}
          >
            <input
              id={formId + "-name"}
              type="text"
              autoComplete={isOtpPortal ? "name" : "organization"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isOtpPortal ? "Ramesh Kumar" : "District Veterinary Hospital, Pune"}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? formId + "-name-error" : undefined}
              className="w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring"
            />
          </Field>

          <Field
            id={formId + "-contact"}
            anchorId={formId + "-contact"}
            label={isOtpPortal ? "Mobile number" : "Official email"}
            error={errors.contact}
            help={isOtpPortal ? "Used for OTP sign-in and outbreak alerts." : undefined}
            helpId={formId + "-contact-help"}
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
                  onChange={(e) => setContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  aria-invalid={errors.contact ? true : undefined}
                  aria-describedby={
                    (errors.contact ? formId + "-contact-error " : "") + formId + "-contact-help"
                  }
                  className="flex-1 min-w-0 min-h-[48px] border border-gray-200 rounded-r-xl px-4 text-base bg-[#FAF9F6] focus-ring"
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
                aria-describedby={errors.contact ? formId + "-contact-error" : undefined}
                className="w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring"
              />
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={formId + "-state"}
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                State
              </label>
              <select
                id={formId + "-state"}
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                autoComplete="address-level1"
                className="w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring"
              >
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <Field id={formId + "-district"} anchorId={formId + "-district"} label="District" error={errors.district}>
              <input
                id={formId + "-district"}
                type="text"
                autoComplete="address-level2"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Pune"
                aria-invalid={errors.district ? true : undefined}
                aria-describedby={errors.district ? formId + "-district-error" : undefined}
                className="w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring"
              />
            </Field>
          </div>

          <div>
            <label
              htmlFor={formId + "-lang"}
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Preferred language
            </label>
            <select
              id={formId + "-lang"}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-describedby={formId + "-lang-help"}
              className="w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring"
            >
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
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
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#2D6A4F] transition-colors focus-ring"
            >
              Create account <IconArrowRight />
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
  anchorId,
  label,
  error,
  help,
  helpId,
  children,
}: {
  id: string;
  anchorId: string;
  label: string;
  error?: string;
  help?: string;
  helpId?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      {children}
      {help && (
        <p id={helpId} className="text-xs text-gray-500 mt-2">
          {help}
        </p>
      )}
      {error && (
        <p id={anchorId + "-error"} className="text-sm text-[#B91C1C] mt-2 flex items-center gap-1.5">
          <span aria-hidden="true">
            <IconAlert />
          </span>
          {error}
        </p>
      )}
    </div>
  );
}
