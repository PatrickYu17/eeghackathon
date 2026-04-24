# Scaffold

Bun monorepo scaffold with Next.js frontend and Hono REST API.

## Stack

- **Monorepo**: Bun workspaces + Turborepo
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
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
   # Edit .env with your DATABASE_URL and secrets
   ```

3. **Push database schema**
   ```bash
   bun run db:push
   ```

4. **Start dev servers**
   ```bash
   bun dev
   ```
   - Web: http://localhost:3000
   - API: http://localhost:3001

## Deploy

Deploy `apps/web` and `apps/api` as **two separate Vercel projects** from the same repo.

- **Web project**: Root directory `apps/web`
- **API project**: Root directory `apps/api`

Make sure Vercel installs workspace packages (Build & Install Settings → Package Manager: `bun`).
