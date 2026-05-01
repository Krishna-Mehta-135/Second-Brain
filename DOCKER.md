# Docker Configuration Guide

This project uses a multi-stage Docker build process to ensure small, secure, and reproducible production images.

## Why Multi-Stage Builds Matter
Multi-stage builds allow us to separate the build environment from the runtime environment.
- **Size:** The build stage includes `pnpm`, `typescript`, `prisma`, and all `devDependencies` (e.g., linters, test runners), which can make the image ~1.2GB. The runner stage only contains the production assets and minimal `node_modules`, resulting in an image of ~150MB.
- **Security:** Production images do not contain source code, build tools, or secret configuration files used during the build process, reducing the attack surface.

## Why `pnpm --frozen-lockfile` is Mandatory
The `--frozen-lockfile` flag ensures that `pnpm` does not update the `pnpm-lock.yaml` during the build.
- **Reproducibility:** Every build will use the exact same versions of dependencies that were tested locally.
- **Safety:** It prevents "it works on my machine" bugs caused by minor or patch version changes that might occur if the lockfile were allowed to update during the Docker build.

## `depends_on` with `healthcheck`
In `docker-compose.yml`, we use `depends_on` with a `service_healthy` condition rather than just a service name.
- **Ready vs. Started:** A standard `depends_on: [postgres]` only waits for the Postgres container to *start*. However, Postgres takes several seconds to actually be ready to accept connections.
- **Reliability:** By using `healthcheck`, the API services will only attempt to start once Postgres and Redis are fully initialized and responding to pings, preventing "Connection Refused" crashes on startup.

## Next.js Standalone Output
We use `output: 'standalone'` in `next.config.js`. This tells Next.js to automatically bundle only the files needed for production, including the necessary `node_modules`. This is what allows the `apps/web` Docker image to be extremely small and efficient.
