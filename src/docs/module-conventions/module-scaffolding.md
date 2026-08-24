---
type: convention
producer: oriel
status: draft
created: 2026-08-21
updated: 2026-08-22
expires:
deprecatedReason: ""
supersededBy: ""
---

# Module Scaffolding

## Scaffolding

To avoid “blob” files, structure the code this way

```text

src/
├── index.ts
├── core/
│   ├── types.ts
│   ├── middlewares/
│   │   └── di.middleware.ts
│   └── setup/
│       ├── app.middlewares.ts
│       └── app.router.ts
└── modules/
    ├── x/
    │   ├── x.schema.ts
    │   ├── x.repository.ts
    │   ├── x.service.ts
    │   └── x.routes.ts
    └── y/
        └── ...

```

## Elements

- [Router](/src/docs/module-conventions/module-router.md)
- [Service](/src/docs/module-conventions/module-service.md)
- [Repository](/src/docs/module-conventions/module-repository.md)
