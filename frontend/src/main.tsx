import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';
import { monitoring } from './lib/monitoring.ts';

/**
 * NELVYON App Bootstrap
 * - Loads runtime config before render
 * - Initializes monitoring service
 * - Measures and logs startup performance
 * - Graceful fallback if config fails
 */
async function initializeApp() {
  const startTime = performance.now();

  // Initialize monitoring FIRST so it captures any init errors
  monitoring.init({
    tags: {
      app: 'nelvyon',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      env: import.meta.env.MODE,
    },
  });

  try {
    await loadRuntimeConfig();
  } catch (error) {
    console.warn('[NELVYON] Runtime config fallback:', error);
    monitoring.captureWarning('Runtime config failed to load', { error: String(error) });
  }

  const root = document.getElementById('root');
  if (!root) {
    monitoring.captureError(new Error('Root element not found'));
    console.error('[NELVYON] Root element not found');
    return;
  }

  createRoot(root).render(<App />);

  // Log startup time for observability
  const elapsed = Math.round(performance.now() - startTime);
  monitoring.trackPerformance('app_startup', elapsed);
  monitoring.addBreadcrumb('lifecycle', `App mounted in ${elapsed}ms`, 'info');

  if (import.meta.env.DEV) {
    console.log(`[NELVYON] App mounted in ${elapsed}ms`);
  }
}

initializeApp();