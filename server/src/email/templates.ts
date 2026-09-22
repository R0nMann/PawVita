import type { EmailMessage } from "./index.js";

/**
 * The messages Brevo sends. Kept here rather than in a Brevo dashboard
 * template so the wording goes through code review and ships with the deploy.
 */

/** Supabase's `email_action_type`, which decides what the message should say. */
export type EmailActionType =
  | "login"
  | "signup"
  | "magiclink"
  | "recovery"
  | "invite"
  | "email_change"
  | "email_change_current"
  | "email_change_new"
  | "reauthentication";

const PURPOSE: Record<EmailActionType, { subject: string; lead: string }> = {
  login: { subject: "Your PawVita sign-in code", lead: "Use this code to finish signing in to PawVita." },
  signup: { subject: "Confirm your PawVita account", lead: "Use this code to confirm your email address." },
  magiclink: { subject: "Your PawVita sign-in code", lead: "Use this code to finish signing in to PawVita." },
  recovery: { subject: "Reset your PawVita password", lead: "Use this code to reset your password." },
  invite: { subject: "Your PawVita invitation code", lead: "Use this code to accept your invitation." },
  email_change: { subject: "Confirm your new email", lead: "Use this code to confirm the change of email address." },
  email_change_current: { subject: "Confirm your email change", lead: "Use this code to confirm the change of email address." },
  email_change_new: { subject: "Confirm your new email", lead: "Use this code to confirm your new email address." },
  reauthentication: { subject: "Confirm it's you", lead: "Use this code to confirm this action." },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#39" }[c]};`);
}

/**
 * A one-time code, formatted for both HTML and plain-text clients. Deliberately
 * link-free: a code the reader types back into a page they already have open is
 * harder to phish than a button that signs them in.
 */
export function otpEmail(input: { to: string; code: string; action: EmailActionType; minutes: number }): EmailMessage {
  const { subject, lead } = PURPOSE[input.action] ?? PURPOSE.login;
  const code = escapeHtml(input.code);
  const expiry = `This code expires in ${input.minutes} minute${input.minutes === 1 ? "" : "s"}.`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#FAF9F6;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937">
    <table role="presentation" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #E8E5DF;border-radius:16px">
      <tr>
        <td style="padding:28px">
          <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1B4332">PawVita</p>
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Livestock health network</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${escapeHtml(lead)}</p>
          <p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1B4332;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${code}</p>
          <p style="margin:0 0 16px;font-size:13px;color:#6b7280">${escapeHtml(expiry)}</p>
          <p style="margin:0;font-size:13px;color:#6b7280">
            If you did not try to sign in, you can ignore this email — nobody can use the code without it.
          </p>
        </td>
      </tr>
    </table>
    <p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#9ca3af;text-align:center">
      PawVita never asks for this code by phone or message.
    </p>
  </body>
</html>`;

  const text = [
    "PawVita",
    "",
    lead,
    "",
    `Code: ${input.code}`,
    expiry,
    "",
    "If you did not try to sign in, you can ignore this email.",
    "PawVita never asks for this code by phone or message.",
  ].join("\n");

  return { to: input.to, subject, html, text, tag: `auth-${input.action}` };
}
