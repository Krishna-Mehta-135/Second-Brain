# Monorepo Architecture

This project uses a standardized Turborepo structure to ensure scalability, type safety, and high-performance development workflows.

## Key Design Principles

### 1. Shared Types Package (`@repo/types`)
**Problem:** Defining separate interfaces for frontend and backend leads to "drift," where a change in one layer isn't reflected in the other, causing runtime crashes and difficult-to-track bugs.
**Solution:** A dedicated, zero-runtime-dependency package contains every shared interface, enum, and union.
- **Propagation:** A single change in `@repo/types` immediately propagates to both the Node.js backend and Next.js frontend.
- **Build-Time Safety:** TypeScript catches mismatches at build time. If the backend changes a message schema, the frontend build will fail, preventing broken deployments.

### 2. Standardized Build Pipeline (`turbo.json`)
The pipeline is defined with explicit task dependencies (`dependsOn`).
- **Dependency Graph:** `build: { "dependsOn": ["^build"] }` ensures that Turborepo always builds dependencies (like `@repo/crdt`) before the applications that consume them.
- **Reliable Type-Checking:** Similar to builds, type-checking the apps requires their shared package dependencies to be correctly resolved and indexed.

### 3. High-Performance Caching
Turborepo fingerprints every file, environment variable, and configuration.
- **What it saves:** In a CI/CD environment, if you only change a CSS file in the `web` app, Turborepo will skip building `@repo/db`, `ws-backend`, and `http-backend` entirely.
- **Local Dev:** Incremental builds happen in milliseconds rather than minutes.

### 4. Shared CRDT Layer (`@repo/crdt`)
Utilities for Y.js operations (merging, encoding, decoding) are abstracted into a shared package.
- **Environment Agnostic:** This package uses only core Y.js and standard JavaScript APIs (like `Uint8Array`, `TextEncoder`), ensuring it runs identically in Node.js and the Browser.
- **Consistent Logic:** The `ProtocolCodec` class ensures that binary framing for WebSockets is handled exactly the same way on both sides of the wire.

## Repository Structure
- `apps/`: Deployable applications (Next.js, Node.js).
- `packages/`: Shared logic and configuration.
  - `types/`: Unified TypeScript definitions.
  - `crdt/`: Shared CRDT utilities and binary codec.
  - `db/`: Prisma client and shared persistence logic.
  - `ui/`: Shared React component library.
  - `config/`: Centralized `tsconfig.json` and `eslint` rules.
