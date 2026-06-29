async function parseJsonResponse(res, fallbackMessage) {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    throw new Error(data.error || `${fallbackMessage} (${res.status})`);
  }
  if (!isJson) {
    throw new Error("API returned non-JSON response — is the backend running?");
  }
  return data;
}

export async function loginAdmin(password) {
  const res = await fetch("/api/auth/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  return parseJsonResponse(res, "Admin login failed");
}

export async function loginClient(loginCode) {
  const res = await fetch("/api/auth/client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ loginCode }),
  });
  return parseJsonResponse(res, "Client login failed");
}

export async function logoutSession() {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  return parseJsonResponse(res, "Logout failed");
}

export async function fetchSession() {
  const res = await fetch("/api/auth/session", {
    credentials: "include",
  });
  return parseJsonResponse(res, "Session check failed");
}
