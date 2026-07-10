/** Next.js instrumentation hook — keep free of Node-only imports (pg, workers) so `next build` succeeds. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production") {
    const { logProductionEnvValidation } = await import("../../../backend/config/prodEnvValidation");
    logProductionEnvValidation();
  }
}
