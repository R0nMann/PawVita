import { Link, useLocation } from "react-router";
import { useAuth, homeFor } from "../../auth/AuthContext";
import { IconArrowRight } from "../components/Icons";

export default function NotFound() {
  const location = useLocation();
  const { session } = useAuth();

  return (
    <div className="min-h-dvh grid place-items-center bg-[#FAF9F6] px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-6xl font-display font-bold text-[#1B4332]">404</p>
        <h1 className="text-2xl font-display font-bold text-gray-900 mt-3 text-balance">
          We could not find that page
        </h1>
        <p className="text-gray-600 mt-3 leading-relaxed">
          Nothing is served at{" "}
          <code className="bg-white border border-[#E8E5DF] rounded px-1.5 py-0.5 text-sm break-all">
            {location.pathname}
          </code>
          . It may have moved when the livestock owner and hospital apps were merged.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {session && (
            <Link
              to={homeFor(session)}
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-xl bg-[#1B4332] text-white font-semibold font-display hover:bg-[#2D6A4F] transition-colors focus-ring"
            >
              Back to my portal <IconArrowRight />
            </Link>
          )}
          <Link
            to="/"
            className="inline-flex items-center min-h-[48px] px-6 rounded-xl border border-[#E8E5DF] bg-white text-[#1B4332] font-semibold hover:bg-[#FAF9F6] transition-colors focus-ring"
          >
            Go to the home page
          </Link>
          {!session && (
            <Link
              to="/login"
              className="inline-flex items-center min-h-[48px] px-6 rounded-xl border border-[#E8E5DF] bg-white text-[#1B4332] font-semibold hover:bg-[#FAF9F6] transition-colors focus-ring"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
