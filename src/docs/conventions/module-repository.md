---
type: convention
producer: oriel
status: draft
created: 2026-08-22
updated:
expires:
deprecatedReason: ""
supersededBy: ""
---

# Module Repository

Data access factory for a module. Receives the database client scoped to a
tenant and exposes explicit-typed methods with optional transaction override.

```typescript

import { DbClient } from '../../shared/types';
import { XEntity, XInsert } from './x.schema';

export function createXRepository(database: DbClient, tenantId: string) {
  return {
    // Explicit return types
    create: async (data: XInsert, tx?: DbClient): Promise<XEntity> => {
      throw new Error('Not implemented');
    },

    findById: async (id: string, tx?: DbClient): Promise<XEntity | null> => {
      throw new Error('Not implemented');
    }

    // Other data layer methods
  };
}

export type XRepository = ReturnType<typeof createXRepository>;

```

[← Module Scaffolding](/src/docs/conventions/module-scaffolding.md)
