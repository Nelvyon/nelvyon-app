/**
 * Shared helpers for pack E2E staging smokes (growth + beta).
 */
export const BASE = process.env.STAGING_BASE_URL?.trim() || "https://nelvyon.com";
export const BACKEND_API =
  process.env.STAGING_BACKEND_API?.trim() || "https://nelvyon-app-production.up.railway.app";
export const QA_EMAIL = "qa-audit-20260612@nelvyon.test";
export const QA_PASSWORD = "StagingQA2026!";
export const COOKIE = "nelvyon_token";

export function containsMock(value) {
  if (typeof value === "string") return value.includes("mock://");
  if (Array.isArray(value)) return value.some(containsMock);
  if (value && typeof value === "object") return Object.values(value).some(containsMock);
  return false;
}

export async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitForDeploy(label, skipWait) {
  if (skipWait) {
    console.log("SKIP deploy wait");
    return;
  }
  console.log(`Waiting for staging deploy (${label})…`);
  for (let i = 1; i <= 12; i += 1) {
    try {
      const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
      if (health.status === 200) {
        console.log("DEPLOY_READY");
        return;
      }
    } catch (e) {
      console.log(JSON.stringify({ attempt: i, error: String(e) }));
    }
    await sleep(15000);
  }
}

export async function operatorLogin() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login ${res.status}`);
  const data = await res.json();
  return data.token;
}

export async function getWorkspaceId(token) {
  const fallback = process.env.QA_WORKSPACE_ID || "1";
  try {
    const res = await fetch(`${BASE}/api/platform/workspaces/list`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const list = await res.json();
      const ws = Array.isArray(list) ? list[0] : list?.items?.[0];
      if (ws?.id) return ws.id;
    }
  } catch {
    /* fallback */
  }
  return fallback;
}

export async function resolveApiBase(path, token, workspaceId, method = "GET", body) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Cookie: `${COOKIE}=${token}`,
    Accept: "application/json",
    "X-Workspace-Id": String(workspaceId),
  };
  if (body) headers["Content-Type"] = "application/json";

  let res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status !== 404) return { res, base: BASE };

  res = await fetch(`${BACKEND_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { res, base: BACKEND_API };
}

export function defaultBetaIntake({ businessName, sector, portalEmail }) {
  return {
    business_name: businessName,
    sector,
    city: "Madrid",
    country: "ES",
    value_proposition: "Servicio premium de marketing digital con IA",
    primary_cta: "Solicitar demo",
    contact_email: portalEmail,
    contact_name: "Cliente Portal QA",
  };
}

export async function kickoffPack(token, workspaceId, packId, payload) {
  const { res, base } = await resolveApiBase(
    `/api/os/packs/${packId}/kickoff`,
    token,
    workspaceId,
    "POST",
    payload,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`kickoff HTTP ${res.status} via ${base}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

export async function pollPackRun(token, workspaceId, packId, runId, maxAttempts = 24) {
  for (let i = 1; i <= maxAttempts; i += 1) {
    const { res } = await resolveApiBase(
      `/api/os/packs/${packId}/${runId}`,
      token,
      workspaceId,
    );
    if (res.ok) {
      const run = await res.json();
      console.log(JSON.stringify({ poll: i, status: run.status, steps: run.steps?.length }));
      if (run.status === "completed" || run.status === "needs_review" || run.status === "failed") {
        return run;
      }
    }
    await sleep(3000);
  }
  throw new Error("poll timeout waiting for pack completion");
}

export async function createPortalInvite(token, workspaceId, clientId, email) {
  const res = await fetch(`${BASE}/api/platform/portal/invites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: `${COOKIE}=${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Workspace-Id": String(workspaceId),
    },
    body: JSON.stringify({ client_id: clientId, email }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`create invite HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const invite = await res.json();
  if (!invite.token) throw new Error("missing invite token");
  return invite;
}

export async function acceptPortalInvite(inviteToken, password) {
  const res = await fetch(`${BASE}/api/platform/portal/auth/accept-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: inviteToken,
      password,
      name: "Cliente Portal QA",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`accept invite HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const auth = await res.json();
  return auth.access_token;
}

export async function portalLogin(email, password) {
  const res = await fetch(`${BASE}/api/platform/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`portal login HTTP ${res.status}`);
  const auth = await res.json();
  return auth.access_token;
}

export async function fetchPortalDeliverables(portalToken, projectId) {
  const res = await fetch(
    `${BASE}/api/platform/portal/deliverables?project_id=${projectId}&page_size=50`,
    { headers: { Authorization: `Bearer ${portalToken}`, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`portal deliverables HTTP ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

export function verifyDeliverables(items, { minCount, requiredTitles, modulePrefix, fail, pass, warn }) {
  if (items.length < minCount) {
    fail(modulePrefix, "deliverables count", `expected >= ${minCount}, got ${items.length}`);
  } else {
    pass(modulePrefix, "deliverables count", String(items.length));
  }

  for (const title of requiredTitles) {
    const found = items.find(
      (d) =>
        d.title === title ||
        d.title?.includes(title.slice(0, 12)) ||
        (title.startsWith("Informe") && d.title?.startsWith("Informe")),
    );
    if (!found) fail(modulePrefix, `deliverable:${title}`, "missing");
    else pass(modulePrefix, `deliverable:${title}`, found.status ?? "present");
  }

  for (const item of items) {
    const blob = JSON.stringify(item);
    if (containsMock(blob)) {
      fail(modulePrefix, `no-mock:${item.title ?? item.id}`, "contains mock://");
    }
  }
  if (items.length > 0 && !items.some((d) => containsMock(JSON.stringify(d)))) {
    pass(modulePrefix, "no-mock", "all clean");
  }

  const autoApproved = items.filter((d) => d.status === "approved_by_client");
  if (autoApproved.length > 0) {
    pass(modulePrefix, "auto-approved", `${autoApproved.length} entregables QA≥85`);
  } else {
    warn(modulePrefix, "auto-approved", "0 auto-aprobados — revisar QA score");
  }
}
