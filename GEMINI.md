# Second-Brain Turborepo

## Project Overview
Second-Brain is a production-grade full-stack application built using a **Turborepo** monorepo architecture. It is designed for knowledge management and realtime collaboration.

**Key Technologies:**
- **Frontend (`apps/web`):** Next.js (App Router), React, Tailwind CSS v4.
- **HTTP Backend (`apps/http-backend`):** Node.js + TypeScript, Express server for RESTful APIs and authentication.
- **WebSocket Backend (`apps/ws-backend`):** Standalone WebSocket server using `ws` for realtime features.
- **Database (`packages/db`):** Shared PostgreSQL database managed via Prisma ORM. Runs locally via Docker.
- **Shared Configs:** `@repo/eslint-config`, `@repo/typescript-config`.

## Building and Running

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Start Database:**
   ```bash
   docker-compose up -d
   ```

3. **Sync Database Schema:**
   ```bash
   cd packages/db
   pnpm run db:push
   ```

4. **Start All Services:**
   ```bash
   pnpm dev
   ```
   - **Web Frontend:** `http://localhost:3000`
   - **HTTP API:** `http://localhost:9898`
   - **WebSocket:** `ws://localhost:8080`

## Development Conventions

- **Entry Points:** Backends must use `src/server.ts` as their entry point.
- **Type Safety:** Strict TypeScript is mandatory. Avoid `any` and `unknown` where possible.
- **Separation of Concerns:** Keep business logic in `services`, API definitions in `routes`, and data models in the shared `db` package.
- **Monorepo Sharing:** Always import the shared Prisma client from `@repo/db`.
