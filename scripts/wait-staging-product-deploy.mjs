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
    ? { Authorization: `Bearer ${token}`, Accept: "application/json" }
    : {};
  const wsRes = await fetch(`${base}/api/platform/workspaces/list`, { headers, cache: "no-store" });
  let workspaceOk = false;
  if (wsRes.ok) {
    try {
      const rows = await wsRes.json();
      workspaceOk = Array.isArray(rows) && rows.length > 0;
    } catch {
      workspaceOk = false;
    }
  }
  const routes = ["crm/clients", "campaigns"];
  const statuses = {};
  for (const r of routes) {
    try {
      const res = await fetch(`${base}/api/platform/${r}`, { headers, cache: "no-store" });
      statuses[r] = res.status;
    } catch {
      statuses[r] = 0;
    }
  }
  return { health: health.status, workspace: wsRes.status, workspaceOk, statuses, ts: new Date().toISOString() };
}

for (let i = 0; i < 45; i += 1) {
  const r = await probe();
  console.log(JSON.stringify({ attempt: i + 1, ...r }));
  const bffReady =
    r.health === 200 &&
    r.workspaceOk &&
    r.statuses["crm/clients"] === 200 &&
    r.statuses.campaigns === 200;
  if (bffReady) {
    console.log("DEPLOY_READY");
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 20000));
}
console.log("DEPLOY_TIMEOUT");
process.exit(1);
