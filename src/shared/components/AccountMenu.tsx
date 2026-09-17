import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { PORTALS } from "../../auth/portals";
import type { PortalId } from "../../auth/portals";

/**
 * Avatar button that opens the account menu: settings, help and sign out.
 *
 * Both portals put the user's avatar in the top bar, and on small screens that
 * bar is the only chrome on the page — the sidebars are `hidden md:flex` — so
 * this is the one place a logout is reachable at every width.
 *
 * Implemented as a real menu: `aria-haspopup`, arrow-key movement between
 * items, Escape to close, and focus returned to the trigger on close. The
 * hospital header previously ran the logout from a bare `<div onClick>`, which
 * no keyboard or screen reader could reach and which gave no warning about what
 * clicking your own name would do.
 */
export default function AccountMenu({
  name,
  subtitle,
  portal,
  variant = "light",
  avatarClass,
}: {
  name: string;
  /** Role or location line under the name. */
  subtitle?: string;
  /** Falls back to the signed-in session's portal. */
  portal?: PortalId;
  /** "dark" for a coloured header bar, "light" for a white one. */
  variant?: "light" | "dark";
  /** Optional override for the avatar circle's colours. */
  avatarClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const activePortal: PortalId = portal ?? session?.portal ?? "user";
  const base = PORTALS[activePortal].basePath;
  const dark = variant === "dark";

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  // Close when focus or a click leaves the menu entirely.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Opening a menu moves focus into it, so it can be driven from the keyboard.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  function onMenuKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      event.key === "ArrowDown"
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;
    items[nextIndex].focus();
  }

  const itemClass =
    "flex items-center gap-3 w-full min-h-[44px] px-4 text-sm text-left text-gray-700 hover:bg-[#FAF9F6] focus-visible:bg-[#FAF9F6] transition-colors";

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={`flex items-center gap-2 min-h-[44px] pl-1 pr-2 rounded-xl transition-colors focus-ring ${
          dark ? "hover:bg-white/10" : "hover:bg-gray-100"
        }`}
      >
        <span
          className={
            avatarClass ??
            (dark
              ? "w-8 h-8 shrink-0 rounded-full bg-amber-400 text-[#1B4332] grid place-items-center font-bold text-sm"
              : "w-8 h-8 shrink-0 rounded-full gradient-primary text-white grid place-items-center font-bold text-sm font-display")
          }
          aria-hidden="true"
        >
          {name.charAt(0)}
        </span>
        <span
          className={`text-sm font-medium hidden sm:block ${dark ? "text-white" : "text-gray-700"}`}
        >
          {name}
        </span>
        <span
          className={`text-xs transition-transform ${open ? "rotate-180" : ""} ${
            dark ? "text-white/60" : "text-gray-400"
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-[calc(100%+6px)] w-60 bg-white rounded-2xl shadow-2xl border border-[#E8E5DF] overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-display font-semibold text-sm text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-500 truncate">
              {subtitle ?? PORTALS[activePortal].name}
            </p>
          </div>

          <Link to={base + "/settings"} role="menuitem" className={itemClass} onClick={() => close(false)}>
            <span aria-hidden="true">⚙️</span> Settings
          </Link>
          <Link
            to={base + "/help-support"}
            role="menuitem"
            className={itemClass}
            onClick={() => close(false)}
          >
            <span aria-hidden="true">❓</span> Help &amp; Support
          </Link>

          {/* Separated from the navigation items above: signing out ends the
              session, so it should not sit flush against routine links. */}
          <div className="border-t border-gray-100">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/logout");
              }}
              className={itemClass + " text-[#B91C1C] hover:bg-red-50 focus-visible:bg-red-50 font-medium"}
            >
              <span aria-hidden="true">🚪</span> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
