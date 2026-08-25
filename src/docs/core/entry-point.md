---
type: convention
producer: oriel
status: draft
created: 2026-08-25T13:54:30.025Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Entry Point

```typescript
import { applyMiddlewares } from './core/setup/app.middlewares';
import { registerRoutes } from './core/setup/app.router';
import { registerErrorHandlers } from './core/setup/app.errors';

// 1. Crear instancia principal
const app = new Hono<AppEnv>();

// 2. Ejecutar Bootstrapping en orden estricto
applyMiddlewares(app);
registerRoutes(app);
registerErrorHandlers(app);

// 3. Exportar la app (Cloudflare Workers se encarga del resto)
export default app; 
```
