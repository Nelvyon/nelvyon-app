# Railway @nelvyon/web — build context = repo root (monorepo)
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/web/source.config.ts ./apps/web/
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
ENV PORT=3000
EXPOSE 3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/backend/db/node_modules ./backend/db/node_modules
# preDeployCommand: pnpm -C apps/web migrate:prod (cwd must be monorepo root)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/apps/web/scripts ./apps/web/scripts
COPY --from=builder /app/backend/db ./backend/db
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/.source ./apps/web/.source
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /app/apps/web/source.config.ts ./apps/web/source.config.ts
COPY --from=builder /app/apps/web/server.js ./apps/web/server.js
# next.config.ts se carga EN ARRANQUE, no solo al construir: cada import con
# ruta relativa tiene que existir tambien en la imagen final. `.next` no lo
# cubre, porque la config se lee antes de servir nada.
#
# Cada olvido aqui es un despliegue que compila y luego no arranca. Ya paso:
# staging quedo en bucle de reinicio con
#
#     Cannot find module './src/features/public-web/aiorNelvyonRoutes'
#     ⨯ Failed to load next.config.ts
#
# El import se anadio en su dia y este COPY no. Lo vigila
# `backend/tests/test_next_config_runtime_deps.py`, que lee los imports de
# next.config.ts —siguiendo los relativos en cadena— y exige que cada fichero
# resultante lo copie una linea de estas.
COPY --from=builder /app/apps/web/src/lib/security ./apps/web/src/lib/security
COPY --from=builder /app/apps/web/src/features/public-web ./apps/web/src/features/public-web
COPY scripts/railway-mesh-option-a-entrypoint.sh /app/scripts/railway-mesh-option-a-entrypoint.sh
RUN chmod +x /app/scripts/railway-mesh-option-a-entrypoint.sh \
  && (apk add --no-cache wget ca-certificates >/dev/null 2>&1 || true)
WORKDIR /app
# KI-030: cwd must be apps/web when Next loads next.config.ts (not /app).
# Mesh Option A: optional Tailscale userspace when NELVYON_MESH_OPTION_A=1 + TS_AUTHKEY (staging only).
CMD ["sh", "/app/scripts/railway-mesh-option-a-entrypoint.sh"]
