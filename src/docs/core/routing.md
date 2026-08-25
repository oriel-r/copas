---
type: convention
producer: oriel
status: draft
created: 2026-08-25T13:55:27.753Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Routing

```typescript

export function registerRoutes(app: Hono<AppEnv>) {
  const routes = app
    .all("/auth/*", (c) => auth.handler(c.req.raw))
    .route('/x', xRouter)
    // .route('/y', yRouter);

  return routes;
}

export type AppRouterType = ReturnType<typeof registerRoutes>;

```

