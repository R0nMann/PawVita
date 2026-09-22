import type { Logger } from "pino";
import type { Config } from "../config.js";

/**
 * Transactional email. Production sends through Brevo's HTTP API; with no
 * Brevo credentials the messages are written to the log instead, the way the
 * local auth provider prints OTPs, so development needs no account.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Groups messages in Brevo's statistics, e.g. "login-otp". */
  tag?: string;
}

export interface EmailProvider {
  readonly name: "brevo" | "log";
  send(message: EmailMessage): Promise<void>;
}

/** Raised when the transport rejects a message. Never carries the OTP. */
export class EmailError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export class BrevoEmailProvider implements EmailProvider {
  readonly name = "brevo";

  constructor(
    private readonly apiKey: string,
    private readonly sender: { email: string; name: string },
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchImpl(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: this.sender.email, name: this.sender.name },
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
          ...(message.tag && { tags: [message.tag] }),
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (cause) {
      throw new EmailError(`Could not reach Brevo: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    if (!response.ok) {
      // Brevo replies {code, message}; the body never contains the address or code.
      const detail = await response.text().catch(() => "");
      throw new EmailError(`Brevo rejected the message (${response.status}). ${detail}`.trim(), response.status);
    }
  }
}

/** Development stand-in: logs the message instead of sending it. */
export class LogEmailProvider implements EmailProvider {
  readonly name = "log";

  constructor(private readonly logger: Logger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.warn(
      { to: message.to, subject: message.subject, body: message.text },
      "Email not sent — no Brevo credentials configured",
    );
  }
}

export function createEmailProvider(config: Config, logger: Logger): EmailProvider {
  if (config.email.provider === "brevo") {
    return new BrevoEmailProvider(config.email.apiKey, {
      email: config.email.senderEmail,
      name: config.email.senderName,
    });
  }
  // Only a wired-up hook actually routes mail through here; without one
  // Supabase sends its own, and nothing reaches this provider.
  if (config.email.hookSecret) {
    logger.warn("The Send Email hook is configured but Brevo is not — sign-in codes will be written to this log, not sent.");
  }
  return new LogEmailProvider(logger);
}
