export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiErrorDetails {
  status: number;
  message: string;
  payload?: unknown;
}

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = "ApiError";
    this.status = details.status;
    this.payload = details.payload;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  maxRetries?: number;
  retryDelayMs?: number;
  getAccessToken?: () => string | null;
  getWorkspaceId?: () => string | null;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
}

export interface RequestOptions<TBody = unknown> {
  body?: TBody;
  tenantScoped?: boolean;
  retries?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}
