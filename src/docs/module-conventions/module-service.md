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

# Module Service

Business logic factory for a module. Receives its repository (and optionally
services from other modules) plus a transaction runner.

```typescript

import { TransactionRunner } from '../../shared/types';
import { XRepository } from './x.repository';
// import { YRepository } from '../y/y.repository'; // Example of inter-module dependency
import { XEntity, XInsert } from './x.schema';

export function createXService(
  xRepo: XRepository,
  // yService: yService
  runInTx: TransactionRunner
) {
  return {
    // Contract for complex business logic (potentially involving transactions)
    processAction: async (data: XInsert): Promise<{ success: boolean; result: XEntity }> => {
    // yService.exampleAction()

     throw new Error('Not implemented');
    },
  };
}

export type XService = ReturnType<typeof createXService>;

```

[← Module Scaffolding](/src/docs/module-conventions/module-scaffolding.md)
