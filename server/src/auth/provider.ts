/**
 * The identity provider behind sign-in. Production uses Supabase Auth; tests
 * and local development use a stand-in that issues tokens of the same shape.
 *
 * Express never stores passwords or OTPs itself. It forwards sign-in calls to
 * the provider, then verifies the resulting access token on every request and
 * maps its `sub` onto a PawVita user record (users.auth_user_id).
 */

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  authUserId: string;
}

/** Verified claims from an access token. */
export interface AuthClaims {
  authUserId: string;
  /** E.164 with a leading +, if the identity has a phone. */
  phone?: string;
  email?: string;
}

export interface AuthProvider {
  readonly name: "supabase" | "local";
  /** Send a one-time password by SMS. Creates the identity if it does not exist. */
  requestOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, otp: string): Promise<AuthSession>;
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  /**
   * Create an email + password identity. Session is null when the project
   * requires email confirmation before first sign-in.
   */
  signUpWithPassword(email: string, password: string): Promise<{ authUserId: string; session: AuthSession | null }>;
  refresh(refreshToken: string): Promise<AuthSession>;
  signOut(accessToken: string): Promise<void>;
  /** Admin: create a confirmed identity (staff accounts made by an administrator). */
  adminCreateUser(input: { email?: string; phone?: string; password?: string }): Promise<{ authUserId: string }>;
  adminDeleteUser(authUserId: string): Promise<void>;
  verifyAccessToken(token: string): Promise<AuthClaims>;
}

/** Raised for bad credentials, expired OTPs and invalid tokens. Mapped to 401. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly code = "invalid_credentials",
    readonly status = 401,
  ) {
    super(message);
  }
}

/** Supabase stores phones without the leading +. */
export function toE164(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;
  return phone.startsWith("+") ? phone : `+${phone}`;
}
