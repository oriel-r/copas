---
type: convention
producer: oriel
status: draft
created: 2026-08-25T14:10:00.000Z
updated: 2026-08-26
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Infra Types

`InfraEnv` lives in `infra/types.ts` and defines the app bindings (illustrative names). It merges with core `Variables` via `&` to compose `AppEnv` (see [Env Types](/core/env-types.md)).

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