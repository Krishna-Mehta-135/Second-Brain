# Contributing to Knowdex

## Branch Protection Rules

To ensure the stability of the production environment, the following rules are enforced on the `main` branch:

1.  **Pull Requests Required:** All changes must be submitted via a Pull Request. Direct pushes to `main` are disabled.
2.  **Code Review:** At least one approval from a maintainer is required before merging.
3.  **Status Checks:** All CI checks (Typecheck, Lint, Test, Build, and Docker Build Check) must pass successfully.
4.  **Clean History:** Use **Squash and Merge** to keep the Git history clean and linear.

## Development Workflow

1.  Create a feature branch from `develop`.
2.  Implement changes and add tests.
3.  Verify locally using `pnpm turbo dev` or `pnpm turbo test`.
4.  Submit a PR to `develop` for integration testing.
5.  Once verified, `develop` will be merged into `main` for production release.

## CI/CD Architecture Decisions

### 1. `cancel-in-progress`

We use `concurrency` with `cancel-in-progress: true`. In a fast-paced environment, developers often push multiple commits to the same PR in a few minutes. Without this, GitHub would queue multiple runs of the same tests. Canceling the old runs saves significant CI minutes and provides faster feedback on the _latest_ code.

### 2. Turborepo Caching

We cache the `.turbo` directory between runs. This allows Turborepo to skip tasks (like linting or building) for packages that haven't changed since the last successful run. In a large monorepo, this can reduce CI time from minutes to seconds.
_Note: For team-wide performance, we recommend configuring [Turborepo Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share these caches across all developer machines._

### 3. Dual Docker Tagging Strategy

Every Docker image is tagged with both `:latest` and `:${{ github.sha }}`.

- **`:latest`**: Provides a convenient way to pull the most recent stable version for development or debugging.
- **`:${{ github.sha }}`**: Crucial for production safety. By deploying a specific SHA, we ensure that every instance of a service is running the _exact_ same code. It also enables instant, reliable rollbacks by simply repointing the orchestrator to a previous SHA-tagged image.

### 4. Integration Testing with Real Infrastructure

The CI pipeline uses GitHub Actions services to spin up real instances of **PostgreSQL** and **Redis**. We avoid mocking these in integration tests to ensure that our database queries and CRDT synchronization logic work exactly as they would in production.
