/** Next.js instrumentation hook — keep free of Node-only imports (pg, workers) so `next build` succeeds. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // OS queue worker starts on-demand via /api/os/worker, /api/os/execute, and cron routes.
}
