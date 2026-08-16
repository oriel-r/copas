# client

React + TypeScript + Vite SPA, servida como Workers Static Assets con el
Cloudflare Vite plugin. La autenticación (Better Auth) vive en el worker `api`.

## Desarrollo local

Requisitos previos: levantar la API en `http://localhost:8787` y aplicar sus
migraciones D1 locales (ver `code/apps/api/README.md`).

```txt
pnpm --filter api db:migrate:local
pnpm --filter api dev
pnpm --filter client dev
```

El client apunta a la API vía `VITE_BACKEND_URL` en `.env.development`
(`http://localhost:8787`). Ese archivo solo se carga en `vite dev`, por lo que
no afecta el build ni el deploy.

Variables disponibles (ver `.env.example`):

- `VITE_BACKEND_URL`: origen del backend. Vacío para usar el mismo origen.
- `VITE_AUTH_PATH`: ruta donde está montado el handler de Better Auth (`/auth`).
