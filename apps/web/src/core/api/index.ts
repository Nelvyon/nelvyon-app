import { ApiClient } from "@/core/api/apiClient";

let accessTokenProvider: () => string | null = () => null;
let workspaceIdProvider: () => string | null = () => null;

export const setAccessTokenProvider = (provider: () => string | null) => {
  accessTokenProvider = provider;
};

export const setWorkspaceIdProvider = (provider: () => string | null) => {
  workspaceIdProvider = provider;
};

export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000",
  maxRetries: 1,
  retryDelayMs: 250,
  getAccessToken: () => accessTokenProvider(),
  getWorkspaceId: () => workspaceIdProvider(),
});
