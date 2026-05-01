# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/db/package.json ./packages/db/
COPY packages/crdt/package.json ./packages/crdt/
COPY apps/ws-backend/package.json ./apps/ws-backend/

RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY . .

# Build app
RUN pnpm build --filter ws-backend

# Stage 3: Production runtime
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

# Only copy what is needed to run
COPY --from=builder /app/apps/ws-backend/dist ./dist
COPY --from=builder /app/apps/ws-backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 8080

CMD ["node", "dist/server.js"]
