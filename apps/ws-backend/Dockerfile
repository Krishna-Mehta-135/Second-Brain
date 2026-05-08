# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# ─── Stage 2: installer ───────────────────────────────────────────────────────
FROM base AS installer
WORKDIR /app

# Copy manifests first — this layer is cache-stable until lock-file changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json     ./packages/types/
COPY packages/db/package.json        ./packages/db/
COPY packages/crdt/package.json      ./packages/crdt/
COPY packages/config/package.json    ./packages/config/
COPY packages/ui/package.json        ./packages/ui/
COPY apps/ws-backend/package.json    ./apps/ws-backend/

RUN pnpm install --frozen-lockfile

# ─── Stage 3: builder ─────────────────────────────────────────────────────────
FROM installer AS builder
WORKDIR /app

COPY turbo.json ./
COPY packages   ./packages
COPY apps/ws-backend ./apps/ws-backend

RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=ws-backend...

# ─── Stage 4: pruner ──────────────────────────────────────────────────────────
# `pnpm deploy` resolves only PRODUCTION dependencies and emits a fully
# standalone directory with no workspace symlinks and no devDeps.
FROM builder AS pruner
WORKDIR /app

RUN pnpm deploy --filter=ws-backend --prod --force-legacy-deploy /pruned/ws-backend

# ─── Stage 5: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat curl

WORKDIR /app
ENV NODE_ENV=production

COPY --from=pruner  /pruned/ws-backend/node_modules   ./node_modules
COPY --from=builder /app/apps/ws-backend/dist          ./dist
COPY --from=builder /app/apps/ws-backend/package.json  ./

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 appuser && \
    chown -R appuser:nodejs /app
USER appuser

EXPOSE 8080
CMD ["node", "dist/server.js"]
