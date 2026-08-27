---
type: convention
producer: oriel
status: draft
created: 2026-08-25T14:05:00.000Z
updated: 2026-08-26
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Env Types

`AppEnv` lives only in `core/types/env.ts`. Everything else imports it, never redefines it.

- `services` is typed with each service's exported type (`XService`), one per module.
- `InfraEnv` (bindings: `DB`, `AUTH_KV`, secrets) comes from `infra/types` and is merged with `&`.
- `tenantId` is injected via a global middleware.

```typescript
// src/core/types/env.ts
import type { InfraEnv } from '../../../infra/types';
import type { XService } from '../../modules/x/x.service';

export type AppEnv = InfraEnv & {
  Variables: {
    tenantId: string;
    services: {
      x: XService;
    };
  };
};
```