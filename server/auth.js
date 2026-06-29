import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "km_session";
const SESSION_DAYS = 7;

let devSessionSecret = null;

export function isAuthEnforced() {
  if (process.env.REQUIRE_AUTH === "0") return false;
  if (process.env.ADMIN_SECRET) return true;
  return process.env.NODE_ENV === "production";
}

export function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.ADMIN_SECRET?.trim()) {
    console.error("FATAL: Set ADMIN_SECRET in production to protect admin APIs and music files.");
    process.exit(1);
  }
}

function getSessionSecret() {
  const fromEnv = process.env.SESSION_SECRET?.trim() || process.env.ADMIN_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (!devSessionSecret) {
    devSessionSecret = createHmac("sha256", "kramer-dev").update(String(Date.now())).digest("hex");
  }
  return devSessionSecret;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");

  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.role || !payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseRequestSession(req) {
  if (!isAuthEnforced()) {
    return { role: "admin", bypass: true };
  }
  const token = parseCookies(req)[COOKIE_NAME];
  return verifySessionToken(token);
}

/** Real cookie session only — used by /api/auth/session (never dev-bypass). */
export function readCookieSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  return verifySessionToken(token);
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function createSessionToken(role, clientId = null) {
  return signSession({
    role,
    clientId: clientId || undefined,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function isAdminSession(session) {
  if (!isAuthEnforced()) return true;
  return session?.role === "admin";
}

export function isAuthenticatedSession(session) {
  if (!isAuthEnforced()) return true;
  return session?.role === "admin" || session?.role === "client";
}

export function safeEqualSecret(a, b) {
  const left = Buffer.from(String(a ?? ""));
  const right = Buffer.from(String(b ?? ""));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
