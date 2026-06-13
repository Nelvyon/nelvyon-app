const base = "https://ideal-victory-staging.up.railway.app";

async function loginToken() {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "qa-audit-20260612@nelvyon.test",
      password: "StagingQA2026!",
    }),
  });
  if (!login.ok) return null;
  const body = await login.json();
  return body.token;
}

async function probe() {
  const health = await fetch(`${base}/api/health/live`, { cache: "no-store" });
  const token = await loginToken();
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      }
    : {};
  const wsRes = await fetch(`${base}/api/platform/workspaces/list`, { headers, cache: "no-store" });
  let workspaceOk = false;
  let workspaceId = null;
  if (wsRes.ok) {
    try {
      const rows = await wsRes.json();
      workspaceOk = Array.isArray(rows) && rows.length > 0;
      workspaceId = rows?.[0]?.id ?? null;
    } catch {
      workspaceOk = false;
    }
  }
  let clientPostOk = false;
  if (workspaceId) {
    const post = await fetch(`${base}/api/platform/crm/clients`, {
      method: "POST",
      headers: { ...headers, "X-Workspace-Id": String(workspaceId) },
      body: JSON.stringify({
        business_name: `Deploy probe ${Date.now()}`,
        sector: "Tech",
      }),
    });
    clientPostOk = post.status === 201;
  }
  return {
    health: health.status,
    workspace: wsRes.status,
    workspaceOk,
    clientPostOk,
    ts: new Date().toISOString(),
  };
}

for (let i = 0; i < 45; i += 1) {
  const r = await probe();
  console.log(JSON.stringify({ attempt: i + 1, ...r }));
  const ready = r.health === 200 && r.workspaceOk && r.clientPostOk;
  if (ready) {
    console.log("DEPLOY_READY");
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 20000));
}
console.log("DEPLOY_TIMEOUT");
process.exit(1);
