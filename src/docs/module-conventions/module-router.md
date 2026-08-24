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

# Module Router

Route definitions for a module. Validates input with Zod and delegates to the
module service obtained from the DI container.

```typescript

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AppEnv } from '../../di.middleware';
import { insertXSchema } from './x.schema';

const app = new Hono<AppEnv>();

const xRoutes = app
  .post('/', zValidator('json', insertXSchema), async (c) => {

    const service = c.get('services').x;
    const body = c.req.valid('json');

    try {
      const result = await service.processAction(body);

      return c.json({ success: true, data: result }, 200);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

export type XRoutesType = typeof xRoutes;
export { app as xRouter };

```

[← Module Scaffolding](/src/docs/module-conventions/module-scaffolding.md)
