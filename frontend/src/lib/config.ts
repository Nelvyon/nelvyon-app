// Runtime configuration
let runtimeConfig: {
  API_BASE_URL: string;
} | null = null;

// Configuration loading state
let configLoading = true;

// Default fallback configuration
const defaultConfig = {
  API_BASE_URL: 'http://127.0.0.1:8000',
};

// Function to load runtime configuration
export async function loadRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        runtimeConfig = await response.json();
      }
    }
  } catch (err) {

    if (import.meta.env.DEV) console.warn("[config] Error (// Silent — use defaults):", err);

  } finally {
    configLoading = false;
  }
}

// Get current configuration
export function getConfig() {
  if (configLoading) {
    return defaultConfig;
  }

  if (runtimeConfig) {
    return runtimeConfig;
  }

  if (import.meta.env.VITE_API_BASE_URL) {
    return {
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    };
  }

  return defaultConfig;
}

/**
 * API origin for requests.
 * - Dev: empty string → same origin as the Vite dev server (`/api` proxied to FastAPI) so HttpOnly auth cookies work.
 * - Prod: set `VITE_API_BASE_URL` if the API is on another host; use same-site cookie domain on the server when possible.
 */
export function getAPIBaseURL(): string {
  const viteUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof viteUrl === 'string' && viteUrl.length > 0) {
    return viteUrl.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '';
  }
  return getConfig().API_BASE_URL.replace(/\/$/, '');
}

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};