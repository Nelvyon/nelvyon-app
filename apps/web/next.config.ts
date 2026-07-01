import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { createMDX } from "fumadocs-mdx/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withMDX = createMDX();

/** HTTP security headers (MIG 281). CSP tuned for PostHog, Stripe Checkout, Sentry. */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://eu.i.posthog.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://eu.i.posthog.com https://eu.posthog.com https://api.stripe.com https://*.sentry.io",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://formspree.io",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS_WITHOUT_CSP = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
] as const;

const SECURITY_HEADERS_WITH_CSP = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  ...SECURITY_HEADERS_WITHOUT_CSP,
] as const;

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
      { source: "/legal/privacy", destination: "/privacy", permanent: true },
      { source: "/legal/terms", destination: "/terms", permanent: true },
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
