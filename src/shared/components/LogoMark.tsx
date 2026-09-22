/**
 * The PawVita mark, from `public/logo-mark.png` (generated from the master
 * artwork by `scripts/generate-icons.mjs`).
 *
 * The artwork is dark green on transparent, so on any dark surface it needs
 * `plate` — a light rounded tile — or it sinks into the background. Every use
 * sits next to the word "PawVita", so the image is decorative and hidden from
 * screen readers to avoid announcing the brand twice.
 */
export default function LogoMark({
  size = "w-9 h-9",
  plate = false,
  className = "",
}: {
  /** Tailwind width/height pair; the mark is square. */
  size?: string;
  /** Light tile behind the mark, for dark headers, sidebars and footers. */
  plate?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${size} shrink-0 grid place-items-center ${plate ? "rounded-xl bg-[#FAF9F6] p-1" : ""} ${className}`}
    >
      <img src="/logo-mark.png" alt="" className="w-full h-full object-contain" />
    </span>
  );
}
