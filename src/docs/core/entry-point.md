---
type: convention
producer: oriel
status: draft
created: 2026-08-25T13:54:30.025Z
updated: 2026-08-26
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Entry Point

```typescript
import { applyMiddlewares } from './core/setup/app.middlewares';
import { registerRoutes } from './core/setup/app.router';
import { registerErrorHandlers } from './core/setup/app.errors';
import { AppEnv } from './types/env';

// 1. Create the main instance
const app = new Hono<AppEnv>();

// 2. Bootstrap in strict order
applyMiddlewares(app);
registerRoutes(app);
registerErrorHandlers(app);

// 3. Export app (Cloudflare Workers handles the rest)
export default app; 
```
