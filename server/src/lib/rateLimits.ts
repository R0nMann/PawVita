import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Config } from "../config.js";
import { normalizePhone } from "./validation.js";

/**
 * Rate limits keyed by who is asking, not only where from. Farmers in a
 * village, staff at a hospital and a hackathon demo room all share one public
 * IP, so per-IP limits alone would lock out a whole cooperative after a few
 * sign-ins.
 */

function byIp(req: Request) {
  return `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

/**
 * The `sub` of a bearer token, read without verifying it — this only picks a
 * bucket. A forged token gains nothing: it gets its own bucket and a 401.
 */
function tokenSubject(req: Request): string | undefined {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const payload = token?.split(".")[1];
  if (!payload) return undefined;
  try {
    const sub = (JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown }).sub;
    return typeof sub === "string" ? sub : undefined;
  } catch {
    return undefined;
  }
}

function limiter(
  config: Config,
  name: string,
  windowMs: number,
  limit: number,
  key: (req: Request) => string | undefined = () => undefined,
): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => !config.rateLimitsEnabled,
    keyGenerator: (req) => `${name}:${key(req) ?? byIp(req)}`,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: "rate_limited", message: "Too many attempts. Try again later." } });
    },
  });
}

const MINUTE = 60 * 1000;

export function rateLimits(config: Config) {
  const phone = (req: Request) => {
    const raw = (req.body as { phone?: unknown } | undefined)?.phone;
    const normalized = typeof raw === "string" ? normalizePhone(raw) : null;
    return normalized ? `phone:${normalized}` : undefined;
  };
  const identifier = (req: Request) => {
    const raw = (req.body as { identifier?: unknown } | undefined)?.identifier;
    return typeof raw === "string" ? `id:${raw.trim().toLowerCase()}` : undefined;
  };
  return {
    /** Every API call: per signed-in account, else per IP. */
    api: limiter(config, "api", MINUTE, config.rateLimitPerMinute, (req) => {
      const sub = tokenSubject(req);
      return sub ? `user:${sub}` : undefined;
    }),
    /** SMS costs money: a few per phone, and a ceiling per IP so one address cannot spray many numbers. */
    otpSendPerPhone: limiter(config, "otp-send", 10 * MINUTE, 5, phone),
    otpSendPerIp: limiter(config, "otp-send-ip", 10 * MINUTE, 60),
    otpVerifyPerPhone: limiter(config, "otp-verify", 10 * MINUTE, 10, phone),
    loginPerIdentifier: limiter(config, "login", 10 * MINUTE, 10, identifier),
    loginPerIp: limiter(config, "login-ip", 10 * MINUTE, 200),
    registerPerIp: limiter(config, "register", 10 * MINUTE, 20),
    refreshPerIp: limiter(config, "refresh", 10 * MINUTE, 300),
  };
}
