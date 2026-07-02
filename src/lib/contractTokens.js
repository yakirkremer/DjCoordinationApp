/** Browser-safe signing link token (also mirrored on server). */
export function generateSignToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildContractShareUrl(signToken) {
  if (!signToken) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/c/${encodeURIComponent(signToken)}`;
}
