---
type: convention
producer: oriel
status: draft
created: 2026-08-21
updated: 2026-08-25
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
└── modules/
    ├── x/
    │   ├── x.repository.ts
    │   ├── x.repository.test.ts
    │   ├── x.service.ts
    │   ├── x.service.test.ts
    │   ├── x.routes.ts
    │   ├── x.routes.test.ts
    │   └── x-implementation-doc.md   # optional
    └── y/
        └── ...

```

## Elements

- [Router](/src/docs/arquitectura/convenciones-modulos/module-router.md)
- [Service](/src/docs/arquitectura/convenciones-modulos/module-service.md)
- [Repository](/src/docs/arquitectura/convenciones-modulos/module-repository.md)
