# SuperStack

Hosted version: [**superstack.sh**](https://superstack.sh)

SuperStack is an AI clinician copilot for complex medication and supplement stacks.

It lets clinicians:

- create and update patients conversationally
- switch between multiple patient profiles
- ask consult questions in chat
- get tiered recommendations ranked by relevance
- inspect current and proposed interactions in a graph view

## Tech stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Vercel AI SDK + AI Gateway
- NextAuth
- Postgres + Drizzle ORM
- React Flow
- Vercel Blob
- Redis

## Prerequisites

- Node.js 20+
- `pnpm`
- A Postgres database
- A Vercel AI Gateway API key for local/non-Vercel usage
- Optional but recommended: Vercel Blob and Redis

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the example env file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in the required environment variables in `.env.local`.

4. Run database migrations:

   ```bash
   pnpm db:migrate
   ```

5. Start the development server:

   ```bash
   pnpm dev
   ```

6. Open the app at:

   ```text
   http://localhost:3000
   ```

## Environment variables

Create a `.env.local` file in the project root.

### Required

| Variable | Required | What it is for |
| --- | --- | --- |
| `AUTH_SECRET` | Yes | Secret used by NextAuth / JWT session handling. Generate one with `openssl rand -base64 32`. |
| `POSTGRES_URL` | Yes | Postgres connection string used by the app and Drizzle migrations. |
| `AI_GATEWAY_API_KEY` | Yes for local/non-Vercel | API key for Vercel AI Gateway. On Vercel, authentication is handled automatically via OIDC. |

### Optional / feature-dependent

| Variable | Required | What it is for |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Recommended | Enables file uploads via Vercel Blob. Without it, uploads fall back to inline data URLs where possible. |
| `REDIS_URL` | Optional | Enables resumable chat stream support and related runtime features. |
| `NEXT_PUBLIC_APP_URL` | Optional | Public base URL used for metadata. Defaults to `http://localhost:3000` in local development. |
| `IS_DEMO` | Optional | If set to `1`, serves the app under `/demo` with demo-specific base path behavior. |

### Example `.env.local`

```env
AUTH_SECRET=replace_me
AI_GATEWAY_API_KEY=replace_me
POSTGRES_URL=replace_me
BLOB_READ_WRITE_TOKEN=replace_me
REDIS_URL=replace_me
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database

Apply migrations locally with:

```bash
pnpm db:migrate
```

Useful database commands:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
pnpm db:push
```

## Scripts

```bash
pnpm dev        # start local dev server
pnpm build      # run migrations, then build
pnpm start      # start production server
pnpm test       # run Playwright tests
pnpm check      # lint/check
pnpm fix        # auto-fix lint/style issues
```

## Notes

- Drizzle loads environment variables from `.env.local`.
- If `POSTGRES_URL` is missing, migrations are skipped.
- If `REDIS_URL` is missing, the app still runs, but resumable streaming features are disabled.
- For the best local experience, use the full set of env vars from `.env.example`.
