FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY backend/package.json ./backend/
COPY backend/db/package.json ./backend/db/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/backend/db/node_modules ./backend/db/node_modules
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm -C apps/web build:prod

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Do not set HOSTNAME — Docker injects the container ID and breaks HTTP binding.
ENV PORT=3000
EXPOSE 3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/backend/db ./backend/db
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /app/apps/web/server.js ./apps/web/server.js
WORKDIR /app/apps/web
CMD ["node", "server.js"]
