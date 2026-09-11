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

# Di

```typescript
import { AppEnv } from '../types/env';

export const injectAppServices = createMiddleware<AppEnv>(async (c, next) => {
  const organizationId = c.get('session').activeOrganizationId

  const services = {
    get x() {
      const repo = createXRepository(db, tenantId);
      const transactionRunner = async (cb: any) => db.transaction(cb);
      
      return createXService(repo, transactionRunner);
    }

    // get y() {...} ... Others services
  };

  c.set('services', services);
  
  await next();
});

```
