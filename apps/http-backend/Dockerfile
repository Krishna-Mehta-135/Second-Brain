# Stage 1: Install dependencies
FROM node:20-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/db/package.json ./packages/db/
COPY apps/http-backend/package.json ./apps/http-backend/

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

# Build app (Turbo will handle Prisma generation via task dependencies)
RUN pnpm build --filter http-backend

# Stage 3: Production runtime
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

# Only copy what is needed to run
COPY --from=builder /app/apps/http-backend/dist ./dist
COPY --from=builder /app/apps/http-backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 8000

CMD ["node", "dist/server.js"]
