import { lazy, ComponentType } from 'react';

/**
 * Wraps a dynamic import with retry logic to handle stale chunk errors.
 * When a new deployment changes chunk hashes, users with cached pages
 * will fail to load the old chunk URLs. This retries the import and
 * forces a page reload as a last resort.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries = 2,
  interval = 1000,
) {
  return lazy(() => retryImport(importFn, retries, interval));
}

async function retryImport<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries: number,
  interval: number,
): Promise<{ default: T }> {
  try {
    return await importFn();
  } catch (error) {
    if (retries <= 0) {
      // Last resort: if the chunk is truly stale, reload the page once.
      // Use sessionStorage to prevent infinite reload loops.
      const reloadKey = 'nelvyon-chunk-reload';
      const hasReloaded = sessionStorage.getItem(reloadKey);

      if (!hasReloaded) {
        sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();
        // Return a never-resolving promise while the page reloads
        return new Promise(() => {});
      }

      // Already reloaded once — clear flag and throw so ErrorBoundary catches it
      sessionStorage.removeItem(reloadKey);
      throw error;
    }

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, interval));
    return retryImport(importFn, retries - 1, interval);
  }
}