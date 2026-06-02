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
    "@sentry/node",
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
      };
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/legal/privacy", destination: "/privacy", permanent: true },
      { source: "/legal/terms", destination: "/terms", permanent: true },
      { source: "/work", destination: "/servicios", permanent: true },
      { source: "/products", destination: "/servicios", permanent: true },
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
