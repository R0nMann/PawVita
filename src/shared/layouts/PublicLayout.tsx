import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth, homeFor, portalFor } from "../../auth/AuthContext";
import { PORTAL_LIST } from "../../auth/portals";
import OutbreakTicker from "../components/OutbreakTicker";
import { IconClose, IconMenu, IconPhone } from "../components/Icons";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/how-it-works", label: "How It Works" },
];

export default function PublicLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useAuth();

  // The public shell owns no portal, so clear any tag a portal left behind.
  useEffect(() => {
    delete document.documentElement.dataset.portal;
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center min-h-[44px] px-1 text-sm font-medium transition-colors rounded focus-ring ${
      isActive ? "text-[#1B4332] font-semibold" : "text-gray-600 hover:text-[#1B4332]"
    }`;

  return (
    <div className="min-h-dvh bg-[#FAF9F6] flex flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <OutbreakTicker />

      <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-40 border-b border-[#E8E5DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-ring shrink-0">
            <span
              className="w-9 h-9 gradient-hero rounded-xl grid place-items-center text-lg"
              aria-hidden="true"
            >
              🐄
            </span>
            <span className="leading-tight">
              <span className="block font-display font-bold text-[#1B4332]">PawVita</span>
              <span className="block text-[11px] text-gray-500">Livestock Disease Surveillance</span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:flex items-center gap-7">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <span className="text-sm text-gray-600">
                  {portalFor(session).name}
                </span>
                <Link
                  to={homeFor(session)}
                  className="inline-flex items-center min-h-[44px] px-5 rounded-xl bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#2D6A4F] transition-colors focus-ring"
                >
                  Go to my portal
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-[#1B4332] hover:bg-[#E8F1EC] transition-colors focus-ring"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center min-h-[44px] px-5 rounded-xl bg-[#1B4332] text-white text-sm font-semibold hover:bg-[#2D6A4F] transition-colors focus-ring"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden w-11 h-11 grid place-items-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus-ring text-xl"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>

        {menuOpen && (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="md:hidden border-t border-[#E8E5DF] bg-white px-4 py-3 space-y-1"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center min-h-[44px] px-2 rounded-lg text-sm transition-colors focus-ring ${
                    isActive ? "text-[#1B4332] font-semibold bg-[#E8F1EC]" : "text-gray-700"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-100 grid gap-2">
              {session ? (
                <Link
                  to={homeFor(session)}
                  className="flex items-center justify-center min-h-[44px] rounded-xl bg-[#1B4332] text-white text-sm font-semibold focus-ring"
                >
                  Go to my portal
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center justify-center min-h-[44px] rounded-xl border border-[#E8E5DF] text-[#1B4332] text-sm font-semibold focus-ring"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center min-h-[44px] rounded-xl bg-[#1B4332] text-white text-sm font-semibold focus-ring"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <footer className="bg-[#0F2D1F] text-white/70 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl" aria-hidden="true">
                🐄
              </span>
              <span className="font-display font-bold text-white text-lg">PawVita</span>
            </div>
            <p className="text-sm leading-relaxed">
              AI-assisted livestock disease surveillance connecting villages, veterinary hospitals,
              laboratories and district administrations.
            </p>
          </div>

          {PORTAL_LIST.map((portal) => (
            <div key={portal.id}>
              <h2 className="font-display font-semibold text-amber-400 mb-3 text-sm">{portal.name}</h2>
              <ul className="space-y-2">
                {portal.roles.slice(0, 4).map((role) => (
                  <li key={role.id}>
                    <Link
                      to={role.home}
                      className="text-sm hover:text-white transition-colors rounded focus-ring"
                    >
                      {role.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="font-display font-semibold text-amber-400 mb-3 text-sm">Helpline</h2>
            <p className="flex items-center gap-2 text-white font-semibold">
              <span aria-hidden="true">
                <IconPhone />
              </span>
              1800-180-0044
            </p>
            <p className="text-sm mt-1">Toll free · 24×7 · 22 languages</p>
            <p className="text-sm mt-4 leading-relaxed">
              Ministry of Fisheries, Animal Husbandry &amp; Dairying
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-white/10 text-xs text-center text-white/50">
          © 2026 PawVita — a Government of India initiative. Built for Smart India Hackathon.
        </div>
      </footer>
    </div>
  );
}
