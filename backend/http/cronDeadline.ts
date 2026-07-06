/** Max wall-clock per cron route — prevents hung jobs from blocking the worker. */
export const CRON_ROUTE_DEADLINE_MS = 4 * 60 * 1000;

export async function runWithCronDeadline<T>(
  label: string,
  fn: () => Promise<T>,
  deadlineMs = CRON_ROUTE_DEADLINE_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`[cron:${label}] deadline exceeded (${deadlineMs}ms)`)),
          deadlineMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
