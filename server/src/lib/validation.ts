import { z } from "zod";

export const uuid = z.uuid();

/** `YYYY-MM-DD`, checked to be a real calendar date. */
export const isoDate = z.iso.date();

export const isoDateTime = z.iso.datetime({ offset: true });

/** Query-string boolean: `?unread=true`. */
export const queryBool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

/** Query-string list: `?status=active,under_review` or repeated `?status=a&status=b`. */
export function queryList<T extends z.ZodType>(item: T) {
  return z.preprocess((v) => {
    if (v === undefined || v === "") return undefined;
    const parts = Array.isArray(v) ? v : [v];
    return parts.flatMap((p) => String(p).split(",")).map((s) => s.trim()).filter(Boolean);
  }, z.array(item).optional());
}

export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});
export type Pagination = z.infer<typeof pagination>;

/** Fetch `limit + 1` rows, then call this to trim and report whether more exist. */
export function page<T>(rows: T[], p: Pagination) {
  const hasMore = rows.length > p.limit;
  return { items: hasMore ? rows.slice(0, p.limit) : rows, limit: p.limit, offset: p.offset, hasMore };
}

/**
 * Normalise an Indian mobile number to E.164. Accepts `9876543210`,
 * `09876543210`, `919876543210` and `+91 98765 43210`.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, "");
  const m = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return m ? `+91${m[1]}` : null;
}

export const phone = z
  .string()
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number." });
      return z.NEVER;
    }
    return normalized;
  });

export const email = z.email().transform((v) => v.trim().toLowerCase());

export const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "gu", "pa", "ta", "te", "bn", "kn", "ml", "or", "as"] as const;
export const language = z.enum(SUPPORTED_LANGUAGES);

export const latitude = z.number().min(-90).max(90);
export const longitude = z.number().min(-180).max(180);

/** Trimmed non-empty text with a length cap. */
export const text = (max: number) => z.string().trim().min(1).max(max);

/** `%term%` for ILIKE, with the user's own wildcards escaped. */
export function likePattern(term: string): string {
  return `%${term.replace(/[%_\\]/g, "\\$&")}%`;
}
