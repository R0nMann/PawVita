import { useEffect, useRef, type ReactNode } from "react";

/**
 * A modal built on the native <dialog>: the browser handles focus trapping,
 * Escape to close and the inert background.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> itself.
        if (e.target === ref.current) onClose();
      }}
      className={`rounded-3xl p-0 w-[calc(100%-2rem)] ${wide ? "max-w-2xl" : "max-w-lg"} backdrop:bg-black/40 shadow-2xl`}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <h2 id="modal-title" className="text-lg font-display font-bold text-[#1B4332]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 grid place-items-center rounded-xl text-gray-500 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Label + control wrapper used by the forms inside modals and pages. */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full min-h-[44px] border border-gray-200 rounded-xl px-3.5 text-sm bg-[#FAF9F6] outline-none focus:border-[#1B4332]";
