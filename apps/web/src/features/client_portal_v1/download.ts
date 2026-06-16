import { ApiError } from "@/core/api/types";
import { readPortalJwt } from "@/features/client_portal_v1/portalSession";

function safeFilename(title: string): string {
  const base = title.trim().replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "deliverable";
  return base.includes(".") ? base : `${base}.bin`;
}

export async function downloadPortalDeliverable(deliverableId: string, title: string): Promise<void> {
  const token = readPortalJwt();
  if (!token) {
    throw new Error("Sign in to download files");
  }

  const response = await fetch(`/api/platform/portal/deliverables/${deliverableId}/download`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    redirect: "follow",
  });

  if (!response.ok) {
    let message = "Download failed";
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") message = payload.error;
      else if (typeof payload?.detail === "string") message = payload.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError({ status: response.status, message, payload: null });
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeFilename(title);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
