import crypto from "node:crypto";
import { Router, type Request } from "express";
import { z } from "zod";
import type { Deps } from "../deps.js";
import { otpEmail, type EmailActionType } from "../email/templates.js";
import { HttpError } from "../lib/errors.js";

/**
 * Webhooks Supabase calls out to. Today there is one: the **Send Email** auth
 * hook. Supabase Auth generates and verifies every code itself and, instead of
 * sending the mail from its own built-in SMTP, posts the code here so we can
 * deliver it through Brevo with our own wording.
 *
 * Wire it up in Supabase: Authentication → Hooks → Send Email Hook → HTTPS,
 * URL `https://<api-host>/api/v1/hooks/send-email`, and copy the generated
 * secret into EMAIL_HOOK_SECRET.
 *
 * Requests are signed with the Standard Webhooks scheme, and the signature
 * covers the exact bytes Supabase sent — so this route reads `req.rawBody`
 * (captured in app.ts) rather than the re-serialised JSON.
 */

/** Supabase mirrors Standard Webhooks: reject anything older than this. */
const MAX_SKEW_SECONDS = 5 * 60;

/** Matches Supabase's default OTP validity, used only for the wording. */
const OTP_VALIDITY_MINUTES = 60;

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const HookPayload = z.object({
  user: z.object({ email: z.string().email() }),
  email_data: z.object({
    token: z.string().min(1).max(32),
    email_action_type: z.string(),
  }),
});

/**
 * `v1,whsec_<base64>` (as Supabase shows it), `whsec_<base64>` or a bare
 * base64 secret all decode to the same key bytes.
 */
export function decodeHookSecret(secret: string): Buffer {
  const base64 = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  return Buffer.from(base64, "base64");
}

/**
 * Standard Webhooks: base64 HMAC-SHA256 of `id.timestamp.body`. The header
 * carries a space-separated list so a secret can be rotated without downtime.
 */
export function verifyHookSignature(input: {
  secret: string;
  id: string;
  timestamp: string;
  body: Buffer;
  signatureHeader: string;
  now?: number;
}): boolean {
  const sent = Number(input.timestamp);
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(sent) || Math.abs(now - sent) > MAX_SKEW_SECONDS) return false;

  const signed = Buffer.concat([Buffer.from(`${input.id}.${input.timestamp}.`, "utf8"), input.body]);
  const expected = crypto.createHmac("sha256", decodeHookSecret(input.secret)).update(signed).digest();

  return input.signatureHeader
    .split(" ")
    .filter(Boolean)
    .some((part) => {
      // Each part is "<version>,<base64 signature>"; only v1 is defined.
      const [version, value] = part.split(",");
      if (version !== "v1" || !value) return false;
      const actual = Buffer.from(value, "base64");
      return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    });
}

export function hooksRouter(deps: Deps): Router {
  const { config, email, logger } = deps;
  const router = Router();

  router.post("/send-email", async (req: RawBodyRequest, res) => {
    const secret = config.email.hookSecret;
    // Without a secret every caller would be anonymous — refuse rather than trust.
    if (!secret) throw new HttpError(503, "hook_not_configured", "The email hook is not configured.");

    const id = req.get("webhook-id");
    const timestamp = req.get("webhook-timestamp");
    const signature = req.get("webhook-signature");
    if (!id || !timestamp || !signature || !req.rawBody) {
      throw new HttpError(401, "invalid_signature", "The webhook signature is missing.");
    }
    if (!verifyHookSignature({ secret, id, timestamp, body: req.rawBody, signatureHeader: signature })) {
      throw new HttpError(401, "invalid_signature", "The webhook signature is invalid.");
    }

    const parsed = HookPayload.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_payload", "Unexpected hook payload.");
    const { user, email_data } = parsed.data;

    const message = otpEmail({
      to: user.email,
      code: email_data.token,
      action: email_data.email_action_type as EmailActionType,
      minutes: OTP_VALIDITY_MINUTES,
    });
    await email.send(message);
    // The code itself is never logged.
    logger.info({ action: email_data.email_action_type, transport: email.name }, "Auth email sent");

    res.json({});
  });

  return router;
}
