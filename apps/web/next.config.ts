import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

import {
  SECURITY_HEADERS_WITH_CSP,
  SECURITY_HEADERS_WITHOUT_CSP,
} from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  serverExternalPackages: ["pg", "bcryptjs", "jsonwebtoken", "stripe"],
  webpack: (config) => {
    const backendTsConfig = path.resolve(__dirname, "../../backend/tsconfig.json");
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: /backend/,
      use: [{ loader: "ts-loader", options: { transpileOnly: true, configFile: backendTsConfig } }],
    });
    return config;
  },
  async redirects() {
    return [
      { source: "/legal/privacy", destination: "/privacy", permanent: true },
      { source: "/legal/terms", destination: "/terms", permanent: true },
    ];
  },
  async headers() {
    const webhookHeaders = [...SECURITY_HEADERS_WITHOUT_CSP];
    const defaultHeaders = [...SECURITY_HEADERS_WITH_CSP];
    return [
      {
        source: "/api/webhooks/:path*",
        headers: webhookHeaders.map((h) => ({ key: h.key, value: h.value })),
      },
      {
        source: "/:path*",
        headers: defaultHeaders.map((h) => ({ key: h.key, value: h.value })),
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "nelvyon",
  project: process.env.SENTRY_PROJECT ?? "nelvyon-web",
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: true,
  },
  disableLogger: true,
  automaticVercelMonitors: false,
});
