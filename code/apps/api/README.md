## Development

```txt
pnpm install
pnpm --filter api cf-typegen
pnpm --filter api db:migrate:local
pnpm --filter api dev
```

Copy `infra/cloudflare/.dev.vars.example` to `infra/cloudflare/.dev.vars` and
fill in the local Better Auth and OAuth secrets.

The Better Auth routes are exposed under `/auth`.

OAuth callback URLs:

```txt
http://localhost:8787/auth/callback/google
http://localhost:8787/auth/callback/microsoft
```

## Migrations

The shared Drizzle schema lives in `code/packages/auth-db`. Generate and check
migrations with:

```txt
pnpm --filter @copas/auth-db db:generate
pnpm --filter @copas/auth-db db:check
pnpm --filter api db:migrate:local
```

Apply staging migrations with:

```txt
pnpm --filter api db:migrate:staging
```

Replace the placeholder D1 and KV IDs in `infra/cloudflare/wrangler.jsonc`
before deploying.

## Tests

```txt
pnpm --filter @copas/auth-db test
pnpm --filter api test
pnpm --filter api test:mutation
```

The API unit tests run in Node. The auth integration tests run in the local
Cloudflare Workers runtime with D1 migrations and KV bindings.

## Deployment

```txt
pnpm --filter api deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
pnpm --filter api cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
