import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "budget_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-in-production";
}

export function signToken(payload: string): string {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  if (signature !== expectedSignature) return null;
  return payload;
}

export async function setSessionCookie(): Promise<void> {
  const sessionId = crypto.randomUUID();
  const token = signToken(sessionId);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // Only mark the cookie Secure when explicitly serving over HTTPS.
    // iOS Safari drops Set-Cookie: Secure over plain HTTP, which breaks
    // Tailscale access (http://<host>:3000). Flip COOKIE_SECURE=true after
    // enabling HTTPS (e.g. Tailscale MagicDNS + HTTPS certs).
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) return false;
  return verifyToken(session.value) !== null;
}
