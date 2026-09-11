---
type: concept
producer: agent/senior-architect
status: active
created: 2026-08-28
updated:
---

# Admin Panel

## Objetivo
Interfaz de gestión para administradores de Copas.

## Reglas de Negocio
- **Registro Cerrado**: Bloqueado el registro público. Solo ingresan usuarios pre-creados.
- **SuperAdmin Inicial**: Creado directamente en la base de datos vía script (seeding).
- **Acceso**: Email/Password, Google y Microsoft.
- **Account Linking (OAuth)**: Asocia automáticamente el proveedor si el email corporativo ya existe en la DB. Falla si no existe.
- **Roles**: Rol único `admin`.

## Capacidades 
- **Gestión de Usuarios**: Crear, listar, banear y asignar roles.
- **Soporte (Impersonation)**: Login como otro usuario.
- **Sesiones**: Auditar y revocar sesiones activas.
