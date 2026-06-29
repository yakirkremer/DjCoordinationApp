import { readJsonFile, DATA_FILES, sendJson } from "./dataStore.js";
import {
  clearSessionCookie,
  createSessionToken,
  isAuthEnforced,
  readCookieSession,
  safeEqualSecret,
  setSessionCookie,
} from "./auth.js";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function publicClient(client) {
  if (!client) return null;
  const { loginCode: _loginCode, ...rest } = client;
  return rest;
}

async function handleAdminLogin(req, res) {
  if (!isAuthEnforced()) {
    const token = createSessionToken("admin");
    setSessionCookie(res, token);
    sendJson(res, 200, { ok: true, role: "admin" });
    return;
  }

  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret) {
    sendJson(res, 503, { error: "Admin login is not configured" });
    return;
  }

  let body = {};
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid request body" });
    return;
  }

  if (!safeEqualSecret(body.password, adminSecret)) {
    sendJson(res, 401, { error: "Invalid admin password" });
    return;
  }

  const token = createSessionToken("admin");
  setSessionCookie(res, token);
  sendJson(res, 200, { ok: true, role: "admin" });
}

async function handleClientLogin(req, res) {
  let body = {};
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid request body" });
    return;
  }

  const code = String(body.loginCode ?? "")
    .trim()
    .toUpperCase();
  if (!code) {
    sendJson(res, 400, { error: "loginCode required" });
    return;
  }

  const clients = await readJsonFile(DATA_FILES.clients, []);
  const client = clients.find((c) => String(c.loginCode ?? "").toUpperCase() === code);
  if (!client) {
    sendJson(res, 401, { error: "Invalid access code" });
    return;
  }

  const token = createSessionToken("client", client.id);
  setSessionCookie(res, token);
  sendJson(res, 200, { ok: true, role: "client", client: publicClient(client) });
}

function handleLogout(_req, res) {
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

function handleSession(req, res) {
  handleSessionAsync(req, res).catch((err) => {
    sendJson(res, 500, { error: err.message || "Session check failed" });
  });
}

async function handleSessionAsync(req, res) {
  const session = readCookieSession(req);

  if (!session?.role) {
    sendJson(res, 200, { authenticated: false, role: null, clientId: null, client: null });
    return;
  }

  let client = null;
  if (session.role === "client" && session.clientId) {
    const clients = await readJsonFile(DATA_FILES.clients, []);
    client = publicClient(clients.find((c) => c.id === session.clientId));
  }

  sendJson(res, 200, {
    authenticated: true,
    role: session.role,
    clientId: session.clientId ?? null,
    client,
  });
}

export function createAuthApiMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/api/auth/admin" && req.method === "POST") {
      handleAdminLogin(req, res).catch((err) => {
        sendJson(res, 500, { error: err.message || "Login failed" });
      });
      return;
    }

    if (url.pathname === "/api/auth/client" && req.method === "POST") {
      handleClientLogin(req, res).catch((err) => {
        sendJson(res, 500, { error: err.message || "Login failed" });
      });
      return;
    }

    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      handleLogout(req, res);
      return;
    }

    if (url.pathname === "/api/auth/session" && req.method === "GET") {
      handleSession(req, res);
      return;
    }

    next();
  };
}
