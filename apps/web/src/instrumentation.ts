export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_OS_WORKER === "false") return;

  try {
    const { initOsQueueWorker } = await import("@nelvyon/os-agents");
    initOsQueueWorker();
    console.info("[instrumentation] OS queue worker started");
  } catch (e) {
    console.warn("[instrumentation] OS worker failed to start:", e instanceof Error ? e.message : e);
  }
}
