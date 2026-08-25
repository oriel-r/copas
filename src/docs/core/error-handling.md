---
type: convention
producer: oriel
status: draft
created: 2026-08-25T14:00:00.000Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Error Handling

```typescript
export function registerErrorHandlers(app: Hono<AppEnv>) {
  app.notFound((c) => {
    return c.json({ message: 'Not Found' }, 404);
  });

  app.onError((err, c) => {
    return c.json({ message: 'Internal Server Error' }, 500);
  });
}
```
