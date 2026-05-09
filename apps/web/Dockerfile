# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ─── Stage 2: installer ───────────────────────────────────────────────────────
# Install all workspace deps (dev + prod) needed for the Next.js build.
FROM base AS installer
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json   ./packages/types/
COPY packages/ui/package.json      ./packages/ui/
COPY packages/config/package.json  ./packages/config/
COPY packages/crdt/package.json    ./packages/crdt/
COPY packages/db/package.json      ./packages/db/
COPY apps/web/package.json         ./apps/web/

RUN pnpm install --frozen-lockfile

# ─── Stage 3: builder ─────────────────────────────────────────────────────────
FROM installer AS builder
WORKDIR /app

COPY turbo.json  ./
COPY packages    ./packages
COPY apps/web    ./apps/web

# Build-time public env vars must be declared here (NEXT_PUBLIC_*).
# They are baked into the JS bundle at compile time; runtime values
# are passed via environment variables for server-side usage only.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN pnpm turbo run build --filter=web...

# ─── Stage 4: runner ──────────────────────────────────────────────────────────
# Next.js standalone output is self-contained: it bundles the minimal server
# and required node_modules — no pnpm, no monorepo context needed at runtime.
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
ENV NODE_EXTRA_CA_CERTS=/app/certs/server-ca.pem

# standalone/ contains its own node_modules and server.js at the ROOT.
# In a monorepo the structure is:
#   .next/standalone/
#     server.js          <- entry point
#     apps/web/.next/    <- app server files
#     node_modules/      <- minimal deduplicated deps
COPY --from=builder /app/apps/web/.next/standalone ./

# Static assets must sit at .next/static RELATIVE TO server.js (the root)
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# Public assets must sit at apps/web/public relative to server.js
COPY --from=builder /app/apps/web/public       ./apps/web/public

COPY certs/server-ca.pem /app/certs/server-ca.pem

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
# server.js is located inside apps/web/ relative to the standalone output
CMD ["node", "apps/web/server.js"]
