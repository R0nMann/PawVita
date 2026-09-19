import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";

/**
 * Error with an HTTP status and a stable machine-readable code. Every error
 * response has the shape `{ error: { code, message, details? } }`.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, "bad_request", message, details);
export const unauthorized = (message = "Sign in to continue.") =>
  new HttpError(401, "unauthorized", message);
export const forbidden = (message = "You do not have access to this resource.") =>
  new HttpError(403, "forbidden", message);
export const notFound = (what = "Resource") => new HttpError(404, "not_found", `${what} not found.`);
export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, "conflict", message, details);

export function zodDetails(error: ZodError) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, "route_not_found", `No route for ${req.method} ${req.path}.`));
};

/** Postgres error codes we translate into client errors instead of 500s. */
const PG_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  "23505": { status: 409, code: "conflict", message: "A record with these details already exists." },
  "23503": { status: 400, code: "invalid_reference", message: "A referenced record does not exist." },
  "23514": { status: 400, code: "constraint_violation", message: "The request violates a data rule." },
  "22P02": { status: 400, code: "bad_request", message: "Malformed identifier or value." },
};

function pgCode(err: unknown): string | undefined {
  // Drizzle wraps driver errors; the Postgres code sits on the error or its cause.
  for (let e = err as { code?: unknown; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) return e.code;
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details !== undefined && { details: err.details }) },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "validation_failed", message: "The request is invalid.", details: zodDetails(err) },
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ error: { code: err.code.toLowerCase(), message: err.message } });
    return;
  }
  // express.json() parse failures and oversized bodies.
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500 && err.type) {
    res.status(err.status).json({ error: { code: String(err.type).replace(/\./g, "_"), message: err.message } });
    return;
  }
  const code = pgCode(err);
  const mapped = code ? PG_ERRORS[code] : undefined;
  if (mapped) {
    res.status(mapped.status).json({ error: { code: mapped.code, message: mapped.message } });
    return;
  }

  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong." } });
};
