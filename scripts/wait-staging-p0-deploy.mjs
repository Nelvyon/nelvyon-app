/**
 * Wait until staging has Portal BFF routes deployed (not HTML 404).
 * Usage: node scripts/wait-staging-p0-deploy.mjs
 * Exit 0 = DEPLOY_READY, 1 = DEPLOY_TIMEOUT
 */
const BASE =
  process.env.STAGING_WEB_URL?.trim() || "https://ideal-victory-staging.up.railway.app";
const MAX_ATTEMPTS = Number(process.env.P0_DEPLOY_MAX_ATTEMPTS ?? "36");
const INTERVAL_MS = Number(process.env.P0_DEPLOY_INTERVAL_MS ?? "20000");

async function probe() {
  const health = await fetch(`${BASE}/api/health/live`, { cache: "no-store" });
  const login = await fetch(`${BASE}/api/platform/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "probe@test.com", password: "short" }),
  });
  const me = await fetch(`${BASE}/api/platform/portal/me`, { cache: "no-store" });
  const approve = await fetch(
    `${BASE}/api/platform/portal/deliverables/00000000-0000-0000-0000-000000000001/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer invalid" },
      body: "{}",
    },
  );
  const loginText = await login.text();
  return {
    health: health.status,
    login: login.status,
    me: me.status,
    approve: approve.status,
    loginIsHtml: loginText.trimStart().startsWith("<!"),
  };
}

function isReady(r) {
  return (
    r.health === 200 &&
    r.login !== 404 &&
    !r.loginIsHtml &&
    r.me === 401 &&
    r.approve !== 404
  );
}

for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
  try {
    const r = await probe();
    console.log(JSON.stringify({ attempt: i, ...r }));
    if (isReady(r)) {
      console.log("DEPLOY_READY");
      process.exit(0);
    }
  } catch (e) {
    console.log(JSON.stringify({ attempt: i, error: String(e) }));
  }
  await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
}

console.log("DEPLOY_TIMEOUT");
process.exit(1);
