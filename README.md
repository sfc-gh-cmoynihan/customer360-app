# Next.js Template for Snowflake Apps

Minimal Next.js app deployed as a Snowflake App. Queries Snowflake using the [Node.js SDK](https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver) and demonstrates server-side rendering, API routes, and caller's-rights token handling.

## Local Development

```bash
npm install
npm run dev
```

The app reads Snowflake credentials automatically from your default [Snowflake CLI](https://docs.snowflake.com/en/developer-guide/snowflake-cli/connecting/specify-credentials) connection in `~/.snowflake/config.toml`. No extra configuration needed if you already have `snow` CLI set up.

To use a specific named connection, set `SNOWFLAKE_CONNECTION_NAME`:

```bash
SNOWFLAKE_CONNECTION_NAME=myconn npm run dev
```

Alternatively, skip the config file entirely and provide env vars directly:

```bash
SNOWFLAKE_ACCOUNT=myaccount \
SNOWFLAKE_ACCOUNT_URL=https://myaccount.snowflakecomputing.com \
SNOWFLAKE_USER=myuser \
SNOWFLAKE_PASSWORD=mypassword \
SNOWFLAKE_WAREHOUSE=my_wh \
npm run dev
```

## Deploy

Edit `snowflake.yml` (set the database and app name), then:

```bash
snow app deploy
```

If your CLI does not support `snow app` yet, use:

```bash
snow __app deploy
```

## Structure

```
snowflake.yml                # Deployment config
package.json                 # Dependencies (Next.js, React, snowflake-sdk)
tsconfig.json                # TypeScript config
next.config.mjs              # standalone output + unoptimized images
next-env.d.ts                # Next.js type declarations
public/
└── icon.svg                 # App favicon
app/
├── layout.tsx               # Root layout — metadata, global styles
├── globals.css              # Global stylesheet
├── page.tsx                 # Server Component — runs SQL, renders session info
├── time-button.tsx          # Client Component — calls /api/time on click
├── query-buttons.tsx        # Client Component — compares service vs caller context
└── api/
    ├── time/route.ts        # Returns current Snowflake timestamp
    └── query/route.ts       # Runs CURRENT_USER()/CURRENT_ROLE() with both tokens
lib/
└── snowflake.ts             # Shared query helper (server-side only)
```

## Key Concepts

- **`querySnowflake(sql)`** returns `Record<string, any>[]`. Import it in any server component or route handler.
- **`export const dynamic = "force-dynamic"`** is required on pages/routes that query Snowflake — prevents build-time rendering when the DB is unreachable.
- **Client components** cannot call `querySnowflake()` directly. Create an API route and `fetch()` it instead (see `time-button.tsx` + `api/time/route.ts`).
- **Caller's rights** — The `/api/query` route reads the `sf-context-current-user-token` header provided by SPCS, combines it with the service token via `buildCallerRightsToken()`, and runs a query as the calling user. This lets you compare service context vs caller context side-by-side.
