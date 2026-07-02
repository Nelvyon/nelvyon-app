/** Fetch with hard timeout — prevents staging smokes from hanging indefinitely. */
export async function smokeFetch(url, options = {}, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`fetch timeout after ${timeoutMs}ms: ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Hard cap for entire smoke script — exits 1 on timeout. */
export function installScriptTimeoutGuard(ms = 20 * 60 * 1000, label = "smoke") {
  const timer = setTimeout(() => {
    console.error(`SCRIPT_TIMEOUT (${label}) after ${ms}ms`);
    process.exit(1);
  }, ms);
  return () => clearTimeout(timer);
}
