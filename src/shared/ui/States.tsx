import type { ReactNode } from "react";
import { errorMessage } from "../../api/client";

/** Placeholder while a query loads. `aria-busy` lets screen readers announce it. */
export function Loading({ label = "Loading…", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-12 text-sm text-gray-500 ${className}`} aria-busy="true">
      <span className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-[#1B4332] motion-safe:animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry, className = "" }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={`rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 ${className}`}>
      <p className="font-semibold">Couldn't load this.</p>
      <p className="mt-1">{errorMessage(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-[40px] items-center rounded-xl bg-white px-4 font-semibold text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon = "📭",
  title,
  body,
  action,
  className = "",
}: {
  icon?: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-10 px-4 ${className}`}>
      <div className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <p className="font-semibold font-display text-gray-800">{title}</p>
      {body && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Render a query's loading and error states, and the children once data is
 * there. Cached data is shown straight away, even while a refetch runs.
 */
export function QueryState<T>({
  query,
  children,
  loadingLabel,
}: {
  query: { data: T | undefined; error: unknown; isPending: boolean; refetch: () => unknown };
  children: (data: T) => ReactNode;
  loadingLabel?: string;
}) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <Loading label={loadingLabel} />;
}

/** Inline form error. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-[#B91C1C] bg-red-50 border border-red-200 rounded-xl px-3 py-2">
      {errorMessage(error)}
    </p>
  );
}
