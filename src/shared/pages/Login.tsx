import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { PORTALS, PORTAL_LIST, roleFor } from "../../auth/portals";
import type { PortalId } from "../../auth/portals";
import AuthShell from "../components/AuthShell";
import PortalChoice from "../components/PortalChoice";
import DemoAccess from "../components/DemoAccess";
import RolePicker from "../components/RolePicker";
import { IconAlert, IconArrowRight, IconEye, IconEyeOff } from "../components/Icons";

type Step = "portal" | "identify" | "otp";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signIn } = useAuth();

  const requested = params.get("portal");
  const initialPortal: PortalId =
    requested === "hospital" || requested === "user" ? requested : "user";

  const [portal, setPortal] = useState<PortalId>(initialPortal);
  const [step, setStep] = useState<Step>(requested ? "identify" : "portal");
  const [roleId, setRoleId] = useState(PORTALS[initialPortal].roles[0].id);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formId = useId();

  const config = PORTALS[portal];
  const role = useMemo(() => roleFor(portal, roleId), [portal, roleId]);
  const next = params.get("next");

  // Send focus to the message so it is announced and reachable (WCAG 2.2 error handling).
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  // Each step swaps the whole form; move focus to its heading so context is not lost.
  useEffect(() => {
    if (step !== "portal") headingRef.current?.focus();
  }, [step]);

  function choosePortal(id: PortalId) {
    setPortal(id);
    setRoleId(PORTALS[id].roles[0].id);
    setError(null);
  }

  function complete(name: string, id: string) {
    const created = signIn({ portal, role: roleId, name, identifier: id });
    navigate(next || roleFor(created.portal, created.role).home, { replace: true });
  }

  function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (config.authMethod === "otp") {
      if (!/^\d{10}$/.test(mobile)) {
        setError("Enter the 10-digit mobile number registered with PawVita.");
        return;
      }
      setStep("otp");
      return;
    }

    if (identifier.trim().length < 3) {
      setError("Enter your institution ID or official email address.");
      return;
    }
    if (password.length < 4) {
      setError("Enter your password to continue.");
      return;
    }
    complete(role.label, identifier.trim());
  }

  function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length < 4) {
      setError("Enter the OTP sent to your mobile number.");
      return;
    }
    complete("Ramesh Kumar", "+91 " + mobile);
  }

  const errorBanner = error ? (
    <div
      ref={errorRef}
      tabIndex={-1}
      role="alert"
      className="mt-4 flex items-start gap-3 rounded-xl border border-[#E63946]/30 bg-[#FEE2E2] px-4 py-3 outline-none"
    >
      <span className="text-[#E63946] mt-0.5 text-lg shrink-0" aria-hidden="true">
        <IconAlert />
      </span>
      <p className="text-sm text-[#991B1B]">{error}</p>
    </div>
  ) : null;

  return (
    <AuthShell
      portal={step === "portal" ? null : portal}
      eyebrow="Sign in"
      title={
        step === "portal" ? "Choose how you are joining" : "Sign in to the " + config.name + " portal"
      }
      subtitle={
        step === "portal"
          ? "PawVita brings livestock owners and veterinary institutions onto one surveillance network. Pick the side you work from."
          : config.tagline
      }
    >
      {step === "portal" ? (
        <div>
          <PortalChoice value={portal} onChange={choosePortal} name={formId + "-portal"} />
          <button
            type="button"
            onClick={() => setStep("identify")}
            className="w-full mt-6 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#2D6A4F] transition-colors focus-ring"
          >
            Continue as {config.name} <IconArrowRight />
          </button>
          <p className="text-center text-sm text-gray-500 mt-5">
            New here?{" "}
            <Link
              to="/register"
              className="text-[#1B4332] font-semibold underline underline-offset-2 rounded focus-ring"
            >
              Create an account
            </Link>
          </p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => {
              setStep("portal");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-[#4A90D9] font-medium hover:underline mb-4 min-h-[44px] rounded focus-ring"
          >
            <span aria-hidden="true">←</span> Change portal
          </button>

          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-display font-bold text-gray-900 outline-none"
          >
            {step === "otp" ? "Verify your mobile number" : "Your details"}
          </h2>

          {errorBanner}

          {step === "identify" ? (
            <form onSubmit={handleIdentify} className="mt-5 space-y-5" noValidate>
              <RolePicker
                portal={portal}
                value={roleId}
                onChange={(v) => {
                  setRoleId(v);
                  setError(null);
                }}
                id={formId + "-role"}
              />

              {config.authMethod === "otp" ? (
                <div>
                  <label
                    htmlFor={formId + "-mobile"}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Mobile number
                  </label>
                  <div className="flex">
                    <span className="px-3 grid place-items-center bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-gray-600 text-sm">
                      +91
                    </span>
                    <input
                      id={formId + "-mobile"}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={formId + "-mobile-help"}
                      className="flex-1 min-w-0 min-h-[48px] border border-gray-200 rounded-r-xl px-4 text-base bg-[#FAF9F6] focus-ring"
                    />
                  </div>
                  <p id={formId + "-mobile-help"} className="text-xs text-gray-500 mt-2">
                    We will send a one-time password to this number.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor={formId + "-id"}
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Institution ID or email
                    </label>
                    <input
                      id={formId + "-id"}
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="vh-pune-01 or name@pawvita.in"
                      aria-invalid={error ? true : undefined}
                      className="w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={formId + "-pw"}
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id={formId + "-pw"}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={error ? true : undefined}
                        className="w-full min-h-[48px] border border-gray-200 rounded-xl pl-4 pr-14 text-base bg-[#FAF9F6] focus-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center text-gray-500 hover:text-gray-800 rounded-lg focus-ring"
                      >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#2D6A4F] transition-colors focus-ring"
              >
                {config.authMethod === "otp" ? "Send OTP" : "Sign in"} <IconArrowRight />
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtp} className="mt-5 space-y-5" noValidate>
              <p className="text-sm text-gray-600">
                OTP sent to <span className="font-semibold text-gray-900">+91 {mobile}</span>.{" "}
                <button
                  type="button"
                  onClick={() => setStep("identify")}
                  className="text-[#1B4332] font-semibold underline underline-offset-2 rounded focus-ring"
                >
                  Change number
                </button>
              </p>
              <div>
                <label
                  htmlFor={formId + "-otp"}
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  One-time password
                </label>
                <input
                  id={formId + "-otp"}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={formId + "-otp-help"}
                  className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 text-center text-2xl tracking-[0.4em] bg-[#FAF9F6] focus-ring"
                />
                <p id={formId + "-otp-help"} className="text-xs text-gray-500 mt-2 text-center">
                  Demo build — any 4 to 6 digits will verify.
                </p>
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#2D6A4F] transition-colors focus-ring"
              >
                Verify and continue <IconArrowRight />
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
            New to PawVita?{" "}
            <Link
              to={"/register?portal=" + portal}
              className="text-[#1B4332] font-semibold underline underline-offset-2 rounded focus-ring"
            >
              Register here
            </Link>
          </p>
        </div>
      )}

      <DemoAccess portals={PORTAL_LIST} />
    </AuthShell>
  );
}
