---
type: convention
producer: oriel
status: draft
created: 2026-08-25T14:10:00.000Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Infra Types

`InfraEnv` vive en `infra/types.ts` y define los bindings de la app (nombres ilustrativos). Se fusiona con las `Variables` del core vía `&` para componer `AppEnv` (ver [Env Types](/core/env-types.md)).

```typescript
// infra/types.ts
export type InfraEnv = {
  Bindings: {
    MY_DB: any; // D1Database
    KV_CACHE: any; // KVNamespace
    API_KEY: string;
  };
};
```