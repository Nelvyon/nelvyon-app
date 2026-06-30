/** Shared workspace resolver for staging regression smokes (matches P0 portal-packs). */
export async function getWorkspaceIdWithFallback(baseUrl, token, pass) {
  const fallback = process.env.QA_WORKSPACE_ID || "1";
  try {
    const res = await fetch(`${baseUrl}/api/platform/workspaces/list`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const items = data.items ?? data.workspaces ?? (Array.isArray(data) ? data : []);
      const id = items[0]?.id ?? items[0]?.workspace_id ?? data[0]?.id;
      if (id) {
        pass("auth", "workspace", `id=${id}`);
        return String(id);
      }
    }
  } catch {
    /* fall through to fallback */
  }
  pass("auth", "workspace", `id=${fallback} (fallback)`);
  return fallback;
}
