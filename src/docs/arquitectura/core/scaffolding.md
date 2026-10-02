---
type: convention
producer: oriel
status: active
created: 2026-08-25T13:00:43.115Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Scaffolding

```text

/
├── infra/
├── platform/
└── src/
    ├── core/       # Framework wiring and bootstrapping (DI, routing setup)
    │   ├── middlewares/
    │   │   └── di.middleware.ts
    │   ├── setup/
    │   │   ├── app.middlewares.ts
    │   │   └── app.router.ts
    │   └── types/
    │       └── env.ts
    ├── modules/
    │   ├── x/
    │   ├── y/
    │   └── ...
    ├── shared/     # Global toolbox (types, formatting, custom errors, enums, helpers)
    │   ├── enums/
    │   ├── errors/
    │   ├── helpers/
    │   ├── types/
    │   └── ...
    └── index.ts

```
