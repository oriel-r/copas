# client

React + TypeScript + Vite SPA, servida como Workers Static Assets con el
Cloudflare Vite plugin. La autenticación (Better Auth) vive en el worker `api`.

## Desarrollo local

El client se puede levantar sin el backend: al arrancar hace un chequeo de
disponibilidad (`GET /` con `mode: 'no-cors'` y timeout de 2s). Si el backend
no responde **y** estás en dev (`import.meta.env.DEV`), entra en **modo demo**
con una sesión de usuario falsa y un banner que lo indica, con botón
"Reintentar" para volver a chequear sin recargar.

```txt
pnpm --filter client dev
```

Con el backend levantado el comportamiento es 100% real. En producción un
backend caído no cae en modo demo: muestra el error de sesión normal.

### Con backend (auth real)

Requisitos previos: levantar la API en `http://localhost:8788` y aplicar sus
migraciones D1 locales (ver `src/apps/api/README.md`).

```txt
pnpm --filter api db:migrate:local
pnpm --filter api dev
pnpm --filter client dev
```

El client opera en modo **Same-Origin** mediante enmascaramiento en `/api`:
- En producción/staging, el worker del client enruta `/api/*` hacia el worker `api` mediante Cloudflare Service Bindings.
- En desarrollo local (`vite dev`), Vite utiliza un proxy interno (`/api` -> `http://localhost:8788`).
- Si se define `VITE_BACKEND_URL`, se utiliza como fallback directo omitiendo el proxy local.

Variables disponibles (ver `.env.example`):

- `VITE_BACKEND_URL`: origen del backend. Vacío para usar el mismo origen (/api).
- `VITE_AUTH_PATH`: ruta donde está montado el handler de Better Auth (por defecto `/api/auth` en modo same-origin).
