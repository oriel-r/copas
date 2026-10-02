---
type: convention
producer: oriel
status: draft
created: 2026-08-25T13:56:53.409Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Global Middlewares

```typescript
import { injectAppServices } from './di';
import { AppEnv } from './types/env';

export const applyMiddlewares = (app: Hono<AppEnv>) => {
  app.use('*', exampleMiddleware);
  app.use('*', anotherMiddleware);

  // Other middlewares...
  app.use('*', injectAppServices);
};
```
