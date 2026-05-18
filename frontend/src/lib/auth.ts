import axios, { AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';

/** @deprecated Legacy localStorage key; cleared on load/logout — session is HttpOnly cookie. */
export const ACCESS_TOKEN_STORAGE_KEY = 'nelvyon_token';

/**
 * Demo login (enterDemo) is only allowed when this returns true.
 * - Production builds: always false (demo never available to end users).
 * - Development: set VITE_DEMO_AUTH_ENABLED=true in .env to enable the demo button.
 */
export function isDemoAuthAllowed(): boolean {
  if (import.meta.env.PROD) {
    return false;
  }
  return import.meta.env.VITE_DEMO_AUTH_ENABLED === 'true';
}

/** Remove old JWT copies from localStorage (migration from pre–HttpOnly session). */
export function clearLegacyAuthStorage(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('access_token');
  } catch {
    /* ignore */
  }
}

/** Use for fetch() to same API origin so HttpOnly session cookie is sent. */
export const sessionFetchInit: RequestInit = { credentials: 'include' };

class RPApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private getBaseURL() {
    return getAPIBaseURL();
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get(`${this.getBaseURL()}/api/v1/auth/me`);
      return response.data;
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosErr.response?.status === 401) {
        return null;
      }
      throw new Error(
        axiosErr.response?.data?.detail || 'Failed to get user info'
      );
    }
  }

  /**
   * Start OIDC login — must be a full-page navigation (302 redirect chain).
   * Use same-origin `/api/...` in dev (Vite proxy) so callback + Set-Cookie match the SPA host.
   */
  login(): void {
    window.location.assign(`${this.getBaseURL()}/api/v1/auth/login`);
  }

  async logout() {
    try {
      clearLegacyAuthStorage();
      const response = await this.client.get(`${this.getBaseURL()}/api/v1/auth/logout`);
      const redirectUrl = response.data?.redirect_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      throw new Error(axiosErr.response?.data?.detail || 'Failed to logout');
    }
  }
}

export const authApi = new RPApi();
