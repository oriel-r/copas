---
type: convention
producer: oriel
status: active
created: 2026-08-24T22:56:10.324Z
updated: 2026-08-25
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Endpoints

RESTful naming:

- Resource-based paths: plural nouns (`/policies`, `/insureds`).
- Hierarchy via nesting (`/policies/:id/installments`).
- HTTP methods express the action.
- No verbs in paths (`/connect`, `/sendReminder` ❌).
