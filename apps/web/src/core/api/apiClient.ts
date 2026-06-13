import { ApiClientConfig, ApiError, HttpMethod, RequestOptions } from "@/core/api/types";

const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 250;

const RETRYABLE_STATUS = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Next.js BFF/auth routes — same-origin. FastAPI `/api/v1/*` uses `baseUrl` + CORS. */
export function isNextBffPath(path: string): boolean {
  return (
    path.startsWith("/api/platform/") ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/saas/") ||
    path.startsWith("/api/admin/") ||
    path.startsWith("/api/health/") ||
    path.startsWith("/api/waitlist")
  );
}

export class ApiClient {
  private readonly config: Required<
    Pick<ApiClientConfig, "baseUrl" | "maxRetries" | "retryDelayMs">
  > &
    Omit<ApiClientConfig, "baseUrl" | "maxRetries" | "retryDelayMs">;

  constructor(config: ApiClientConfig) {
    this.config = {
      ...config,
      maxRetries: config.maxRetries ?? DEFAULT_RETRIES,
      retryDelayMs: config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      getAccessToken: config.getAccessToken,
      getWorkspaceId: config.getWorkspaceId,
      onUnauthorized: config.onUnauthorized,
      onForbidden: config.onForbidden,
    };
  }

  get<TResponse>(path: string, options?: RequestOptions): Promise<TResponse> {
    return this.request<TResponse>("GET", path, options);
  }

  post<TResponse, TBody = unknown>(path: string, options?: RequestOptions<TBody>): Promise<TResponse> {
    return this.request<TResponse, TBody>("POST", path, options);
  }

  put<TResponse, TBody = unknown>(path: string, options?: RequestOptions<TBody>): Promise<TResponse> {
    return this.request<TResponse, TBody>("PUT", path, options);
  }

  patch<TResponse, TBody = unknown>(path: string, options?: RequestOptions<TBody>): Promise<TResponse> {
    return this.request<TResponse, TBody>("PATCH", path, options);
  }

  delete<TResponse>(path: string, options?: RequestOptions): Promise<TResponse> {
    return this.request<TResponse>("DELETE", path, options);
  }

  /** POST that returns the raw Response for SSE / streaming consumers. */
  async postStream<TBody = unknown>(
    path: string,
    body: TBody,
    options: Pick<RequestOptions<TBody>, "tenantScoped" | "signal" | "headers"> = {},
  ): Promise<Response> {
    const headers = this.buildHeaders({
      tenantScoped: options.tenantScoped ?? true,
      headers: { Accept: "text/event-stream", ...(options.headers ?? {}) },
    });
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      signal: options.signal,
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await this.tryParsePayload(response);
      const message = this.resolveErrorMessage(response.status, payload);
      if (response.status === 401 && this.config.onUnauthorized) this.config.onUnauthorized();
      if (response.status === 403 && this.config.onForbidden) this.config.onForbidden();
      throw new ApiError({ status: response.status, message, payload });
    }
    return response;
  }

  /** Multipart upload — do not set Content-Type manually (boundary is set by the runtime). */
  async postMultipart<TResponse>(path: string, formData: FormData, options: Pick<RequestOptions, "tenantScoped" | "signal" | "retries"> = {}): Promise<TResponse> {
    const headers: Record<string, string> = {};
    const token = this.config.getAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.tenantScoped) {
      const workspaceId = this.config.getWorkspaceId?.();
      if (workspaceId) headers["X-Workspace-Id"] = workspaceId;
    }
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      signal: options.signal,
      headers,
      body: formData,
    });
    if (!response.ok) {
      const payload = await this.tryParsePayload(response);
      const message = this.resolveErrorMessage(response.status, payload);
      if (response.status === 401 && this.config.onUnauthorized) this.config.onUnauthorized();
      if (response.status === 403 && this.config.onForbidden) this.config.onForbidden();
      throw new ApiError({ status: response.status, message, payload });
    }
    if (response.status === 204) return undefined as TResponse;
    return (await response.json()) as TResponse;
  }

  async getBlob(path: string, options: Pick<RequestOptions, "tenantScoped" | "signal"> = {}): Promise<Blob> {
    const headers: Record<string, string> = {};
    const token = this.config.getAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.tenantScoped) {
      const workspaceId = this.config.getWorkspaceId?.();
      if (workspaceId) headers["X-Workspace-Id"] = workspaceId;
    }
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: "GET",
      signal: options.signal,
      headers,
    });
    if (!response.ok) {
      const payload = await this.tryParsePayload(response);
      const message = this.resolveErrorMessage(response.status, payload);
      if (response.status === 401 && this.config.onUnauthorized) this.config.onUnauthorized();
      if (response.status === 403 && this.config.onForbidden) this.config.onForbidden();
      throw new ApiError({ status: response.status, message, payload });
    }
    return response.blob();
  }

  async request<TResponse, TBody = unknown>(
    method: HttpMethod,
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const retries = options.retries ?? this.config.maxRetries;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const sameOrigin = isNextBffPath(path);
        const response = await fetch(sameOrigin ? path : `${this.config.baseUrl}${path}`, {
          method,
          signal: options.signal,
          headers: this.buildHeaders(options),
          credentials: sameOrigin ? "include" : undefined,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });

        if (response.ok) {
          if (response.status === 204) {
            return undefined as TResponse;
          }
          return (await response.json()) as TResponse;
        }

        const payload = await this.tryParsePayload(response);
        const message = this.resolveErrorMessage(response.status, payload);

        if (response.status === 401 && this.config.onUnauthorized) {
          this.config.onUnauthorized();
        }
        if (response.status === 403 && this.config.onForbidden) {
          this.config.onForbidden();
        }

        if (attempt < retries && RETRYABLE_STATUS.has(response.status)) {
          attempt += 1;
          await sleep(this.config.retryDelayMs * attempt);
          continue;
        }

        throw new ApiError({ status: response.status, message, payload });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (attempt >= retries) {
          throw new ApiError({ status: 0, message: "Network error", payload: error });
        }
        attempt += 1;
        await sleep(this.config.retryDelayMs * attempt);
      }
    }

    throw new ApiError({ status: 0, message: "Unexpected API flow" });
  }

  private buildHeaders(options: RequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    const token = this.config.getAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    if (options.tenantScoped) {
      const workspaceId = this.config.getWorkspaceId?.();
      if (workspaceId) headers["X-Workspace-Id"] = workspaceId;
    }

    return headers;
  }

  private async tryParsePayload(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private resolveErrorMessage(status: number, payload: unknown): string {
    if (typeof payload === "object" && payload && "detail" in payload) {
      const detail = (payload as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
    if (status === 401) return "Unauthorized";
    if (status === 403) return "Forbidden";
    if (status >= 500) return "Server error";
    return "Request failed";
  }
}
