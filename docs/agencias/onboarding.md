---
type: decision
producer: agent/gemini-3.1-pro-high
status: active
created: 2026-08-28
updated:
expires: 2027-08-28
deprecatedReason: ""
supersededBy: ""
---

# Onboarding de Agencias

## Reglas de Negocio

- **Nomenclatura:** De cara al cliente, el concepto de "Organización" se reemplaza por "Agencia". Ej: *"¿Cómo se llama tu agencia?"*.
- **Autenticación (Passwordless):** Registro y login exclusivo vía OAuth (Google/Microsoft). Las credenciales (email+password) quedan restringidas a soporte interno.
- **Límite de Agencias:** Un usuario solo puede pertenecer a una (1) Agencia.
- **Invitaciones:** Bloqueadas para usuarios que ya pertenecen a otra Agencia.
- **Creación:** El usuario solo ingresa el **Nombre**. El sistema (backend) genera el `slug` de forma transparente.
- **UI/UX:** Estética minimalista. Uso estricto de componentes preexistentes en `src/packages/ui` (Shadcn).
