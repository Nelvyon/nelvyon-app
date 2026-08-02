import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { createMDX } from "fumadocs-mdx/next";
import {
  SECURITY_HEADERS_WITHOUT_CSP,
  SECURITY_HEADERS_WITH_CSP,
} from "./src/lib/security/headers";

/**
 * Same guard as `server.js`: skip fumadocs-mdx init on `next start`.
 * Without this, MDX regenerates into `.next` at boot and can leave a corrupted
 * production tree (dev `build-manifest` + empty `static/`), which surfaces as:
 * `TypeError: Cannot read properties of undefined (reading 'call')` in webpack-runtime.
 */
const isNextStartCli =
  process.argv.includes("start") ||
  process.env.npm_lifecycle_event === "start" ||
  process.env._FUMADOCS_MDX === "1";
if (isNextStartCli) {
  process.env._FUMADOCS_MDX = "1";
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withMDX = createMDX();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.aceternity.com",
        pathname: "/**",
      },
    ],
  },
  env: {
    SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING: "1",
  },
  experimental: {
    externalDir: true,
    optimizePackageImports: [
      "lucide-react",
      "@tabler/icons-react",
      "recharts",
      "framer-motion",
    ],
  },
  outputFileTracingIncludes: {
    "/api/**/*": [
      "../../backend/autonomous/templates/registry.json",
      "../../backend/autonomous/templates/**/*.json",
      "../../backend/data/envato-seeds-metadata.json",
    ],
  },
  serverExternalPackages: [
    "ioredis",
    "pg",
    "tsx",
    "bcrypt",
    "bcryptjs",
    "jsonwebtoken",
    "stripe",
    "@opentelemetry/core",
    "@opentelemetry/api",
    "node:http",
    "node:https",
    "node:net",
    "node:tls",
    "node:fs",
    "node:path",
    "node:os",
    "node:crypto",
    "node:stream",
    "node:events",
    "node:buffer",
    "node:util",
    "node:url",
    "node:zlib",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const backendTsConfig = path.resolve(__dirname, "../../backend/tsconfig.json");
      config.module.rules.push({
        test: /\.(ts|tsx)$/,
        include: /backend/,
        use: [{ loader: "ts-loader", options: { transpileOnly: true, configFile: backendTsConfig } }],
      });
    } else {
      config.resolve ??= {};
      config.resolve.alias = {
        ...config.resolve.alias,
        ioredis: false,
        [path.resolve(__dirname, "../../backend/db/RedisClient.ts")]: false,
        // fumadocs-ui imports client hooks (useEffectEvent) from react; avoid react-server entry.
        react: path.dirname(require.resolve("react/package.json")),
        "react-dom": path.dirname(require.resolve("react-dom/package.json")),
      };
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/legal/privacy", destination: "/privacidad", permanent: true },
      { source: "/legal/terms", destination: "/terminos", permanent: true },
      { source: "/privacy", destination: "/privacidad", permanent: true },
      { source: "/terms", destination: "/terminos", permanent: true },
      { source: "/pricing", destination: "/precios", permanent: true },
      { source: "/plataforma", destination: "/producto", permanent: true },
      { source: "/plataforma/:path*", destination: "/producto/:path*", permanent: true },
      { source: "/sobre-nosotros", destination: "/nosotros", permanent: true },
      { source: "/forgot-password", destination: "/auth/forgot-password", permanent: false },
      { source: "/work", destination: "/servicios", permanent: true },
      { source: "/products", destination: "/servicios", permanent: true },

      { source: "/dashboard/social-scheduler", destination: "/saas/social", permanent: true },
      { source: "/dashboard/social-monitoring", destination: "/saas/social", permanent: true },
      { source: "/dashboard/funnels", destination: "/saas/funnels", permanent: true },
      { source: "/dashboard/stores", destination: "/saas/store", permanent: true },
      { source: "/saas/stores", destination: "/saas/store", permanent: true },
      { source: "/dashboard/workflows", destination: "/saas/workflows", permanent: true },
      { source: "/dashboard/workflows/editor", destination: "/saas/workflows", permanent: true },
      { source: "/dashboard/automatizacion", destination: "/saas/workflows", permanent: true },
      { source: "/automations/jobs", destination: "/saas/workflows", permanent: true },
      { source: "/dashboard/crm", destination: "/saas/crm", permanent: true },
      { source: "/crm", destination: "/saas/crm", permanent: true },
      { source: "/saas/dashboard/affiliates", destination: "/saas/affiliates", permanent: true },
      { source: "/saas/dashboard/cpq", destination: "/saas/documentos", permanent: true },
      { source: "/saas/dashboard/dialer", destination: "/saas/dialer", permanent: true },
      { source: "/saas/dashboard/email-warmup", destination: "/saas/secuencias", permanent: true },
      { source: "/saas/dashboard/fb-messenger", destination: "/saas/inbox", permanent: true },
      { source: "/saas/dashboard/instagram-dm", destination: "/saas/inbox", permanent: true },
      { source: "/saas/dashboard/intent-data", destination: "/saas/lead-scoring", permanent: true },
      { source: "/saas/dashboard/integrations", destination: "/saas/integraciones", permanent: true },
      { source: "/saas/dashboard/leads", destination: "/saas/prospecting", permanent: true },
      { source: "/saas/dashboard/linkedin", destination: "/saas/publicidad", permanent: true },
      { source: "/saas/dashboard/pr-digital", destination: "/saas/reputacion", permanent: true },
      { source: "/saas/dashboard/publicidad", destination: "/saas/publicidad", permanent: true },
      { source: "/saas/dashboard/snapchat-ads", destination: "/saas/publicidad", permanent: true },
      { source: "/saas/dashboard/social", destination: "/saas/social", permanent: true },
      { source: "/saas/dashboard/support", destination: "/saas/helpdesk", permanent: true },
      { source: "/saas/dashboard/text2pay", destination: "/saas/billing", permanent: true },
      { source: "/saas/dashboard/tiktok-ads", destination: "/saas/publicidad", permanent: true },
      { source: "/saas/dashboard/tiktok-dm", destination: "/saas/inbox", permanent: true },
      { source: "/saas/dashboard/web-builder", destination: "/saas/web-builder", permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/sites/:subdomain/:slug",
        destination: "/api/public/site/:subdomain/:slug",
      },
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

export default withMDX(withNextIntl(nextConfig));
