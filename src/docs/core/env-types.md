---
type: convention
producer: oriel
status: draft
created: 2026-08-25T14:05:00.000Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Env Types

`AppEnv` solo vive en `core/types/env.ts`; el resto de docs y módulos lo importan, nunca lo redefinen.

- `services` se tipa con el tipo exportado de cada servicio (`XService`), uno por módulo.
- `InfraEnv` (bindings: `DB`, `AUTH_KV`, secrets) viene de `infra/types` y se fusiona con `&`.
- `tenantId` se inyecta vía middleware global.

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