import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { errorMessage } from "../../api/client";
import { authApi } from "../../api/endpoints";
import { useAuth, homeFor } from "../../auth/AuthContext";
import { PORTALS, PORTAL_LIST } from "../../auth/portals";
import type { PortalId } from "../../auth/portals";
import AuthShell from "../components/AuthShell";
import PortalChoice from "../components/PortalChoice";
import DemoAccess from "../components/DemoAccess";
import { IconAlert, IconArrowRight, IconEye, IconEyeOff } from "../components/Icons";

type Step = "portal" | "identify" | "otp";

/**
 * Digits in an emailed sign-in code. Supabase generates the code, so this only
 * caps what the field accepts — it must match the OTP length set on the
 * project (Authentication → Providers → Email), or people cannot type the
 * whole code in. The API accepts 4–8 digits.
 */
const OTP_LENGTH = 8;

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { completeSignIn } = useAuth();

  const requested = params.get("portal");
  const initialPortal: PortalId =
    requested === "hospital" || requested === "user" ? requested : "user";

  const [portal, setPortal] = useState<PortalId>(initialPortal);
  const [step, setStep] = useState<Step>(requested ? "identify" : "portal");
  const [otp, setOtp] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  /** Masked address the code was sent to, shown on the second step. */
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formId = useId();

  const config = PORTALS[portal];
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
    setError(null);
  }

  /** Run a sign-in call with a busy state and a readable error. */
  async function attempt(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleIdentify(e: React.FormEvent) {
    e.preventDefault();

    if (identifier.trim().length < 3) {
      setError("Enter your email address or staff ID.");
      return;
    }
    if (!password) {
      setError("Enter your password to continue.");
      return;
    }
    void attempt(async () => {
      const result = await authApi.login(identifier.trim(), password);
      if (result.twoFactorRequired) {
        // Password accepted; a code is on its way to the account's inbox.
        setCodeSentTo(result.email);
        setOtp("");
        setStep("otp");
        return;
      }
      if (!result.user) {
        throw new Error("This login has no PawVita account yet. Register first.");
      }
      const session = completeSignIn(result.session, result.user, portal);
      navigate(next || homeFor(session), { replace: true });
    });
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) {
      setError("Enter the code from your email.");
      return;
    }
    void attempt(async () => {
      const result = await authApi.verifyLoginOtp(identifier.trim(), otp);
      if (!result.user) {
        throw new Error("This login has no PawVita account yet. Register first.");
      }
      const session = completeSignIn(result.session, result.user, portal);
      navigate(next || homeFor(session), { replace: true });
    });
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

  const submitClass =
    "w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#1B4332] text-white font-bold font-display hover:bg-[#2D6A4F] transition-colors focus-ring disabled:opacity-60";

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
          <button type="button" onClick={() => setStep("identify")} className={submitClass + " mt-6"}>
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
            {step === "otp" ? "Check your email" : "Your details"}
          </h2>

          {errorBanner}

          {step === "identify" ? (
            <form onSubmit={handleIdentify} className="mt-5 space-y-5" noValidate>
              <div>
                <label htmlFor={formId + "-id"} className="block text-sm font-semibold text-gray-700 mb-2">
                  Email or staff ID
                </label>
                <input
                  id={formId + "-id"}
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@pawvita.in or vh-pune-01"
                  aria-invalid={error ? true : undefined}
                  className="w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring"
                />
              </div>
              <div>
                <label htmlFor={formId + "-pw"} className="block text-sm font-semibold text-gray-700 mb-2">
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
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center text-gray-500 hover:text-gray-800 rounded-lg focus-ring"
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={busy} className={submitClass}>
                {busy ? "Please wait…" : "Sign in"}
                {!busy && <IconArrowRight />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="mt-5 space-y-5" noValidate>
              <p className="text-sm text-gray-600">
                Code sent to <span className="font-semibold text-gray-900">{codeSentTo}</span>.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setCodeSentTo(null);
                    setStep("identify");
                  }}
                  className="text-[#1B4332] font-semibold underline underline-offset-2 rounded focus-ring"
                >
                  Start again
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
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                  maxLength={OTP_LENGTH}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={formId + "-otp-help"}
                  className="w-full min-h-[52px] border border-gray-200 rounded-xl px-4 text-center text-2xl tracking-[0.3em] bg-[#FAF9F6] focus-ring"
                />
                <p id={formId + "-otp-help"} className="text-xs text-gray-500 mt-2 text-center">
                  The code expires in a few minutes.{" "}
                  {/* Resending means signing in again — the password is not kept around. */}
                  <button
                    type="button"
                    onClick={() => {
                      setCodeSentTo(null);
                      setStep("identify");
                    }}
                    className="text-[#1B4332] font-semibold underline underline-offset-2"
                  >
                    Send a new code
                  </button>
                </p>
              </div>
              <button type="submit" disabled={busy} className={submitClass}>
                {busy ? "Verifying…" : "Verify and continue"} {!busy && <IconArrowRight />}
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
