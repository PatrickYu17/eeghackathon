# Scaffold

Bun monorepo scaffold with Next.js frontend and Hono REST API.

## Stack

- **Monorepo**: Bun workspaces + Turborepo
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS
- **Backend**: Hono (REST) + BetterAuth + Drizzle ORM
- **Database**: PostgreSQL (self-hosted)
- **API**: REST

## Structure

```
├── apps/
│   ├── web/        # Next.js app
│   └── api/        # Hono REST API
├── packages/
│   ├── db/         # Drizzle schema + DB client
│   ├── shared/     # Shared workspace package
│   └── tsconfig/   # Shared TS configs
```

## Quick Start

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```
   The default `.env` is already configured for local Docker Postgres.

3. **Ensure Docker permissions (one-time)**
   If `docker` commands require `sudo`, add your user to the `docker` group and restart your shell:
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

4. **Start the local database**
   ```bash
   bun run db:up
   ```

5. **Push database schema**
   ```bash
   bun run db:push
   ```

6. **Start dev servers**
   ```bash
   bun run dev
   ```
   This will start Docker Postgres (if not already running), wait for it to be ready, and then launch the dev servers.
   - Web: http://localhost:3000
   - API: http://localhost:3001

To stop the local database:
```bash
bun run db:down
```

## Deploy

Deploy `apps/web` and `apps/api` as **two separate Vercel projects** from the same repo.

- **Web project**: Root directory `apps/web`
- **API project**: Root directory `apps/api`

Each app has a `vercel.json` that installs from the monorepo root and builds with a filtered Turbo command, so workspace packages are available during Vercel builds. Set the package manager to `bun` in Vercel if it is not auto-detected.

Use a hosted PostgreSQL database for deployed environments; the Docker database URL is local-only.

API project environment variables:

```bash
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=<strong-random-secret>
BETTER_AUTH_URL=https://<api-project>.vercel.app
WEB_URL=https://<web-project>.vercel.app
TERACAST_API_KEY=<optional>
TERACAST_MODEL=moonshotai/kimi-k2.6
TERACAST_CHAT_COMPLETIONS_URL=https://inference.teracast.net/v1/chat/completions
```

Web project environment variables:

```bash
NEXT_PUBLIC_API_URL=https://<api-project>.vercel.app
```

Run migrations against the production database before the first deploy and after schema changes:

```bash
DATABASE_URL=postgres://... bun run db:migrate
```
