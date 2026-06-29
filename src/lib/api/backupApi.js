async function parseApiJson(res, fallbackMessage) {
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `${fallbackMessage} (${res.status})`);
    }
    throw new Error(`${fallbackMessage} (${res.status})`);
  }
  return res;
}

export async function downloadBackupArchive() {
  const res = await fetch("/api/admin/backup-export", {
    method: "POST",
    credentials: "include",
  });
  await parseApiJson(res, "Backup export failed");

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = cd.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || "kramer-backup.tar.gz";

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
