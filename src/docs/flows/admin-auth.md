# Admin Auth Flow

## 1. Backend (Better Auth)
- **Whitelist Hook**: `databaseHooks.user.create.before` in `src/packages/auth/src/config.ts`.
  - **Allow**: Request URL contains `/admin/user/create` AND active session role is `admin`.
  - **Block**: Any other creation attempt (public sign-up or unauthorized OAuth) throws `APIError`.
- **Seeding**: SuperAdmin injected via Drizzle script (`src/apps/api/scripts/seed-admin.ts`), bypassing Better Auth APIs.

## 2. Frontend (Client)
- **Routing**: `/admin/*` protected by `RequireAdmin` HOC (checks `session.user.role === 'admin'`).
- **Login**: Dedicated view at `/admin/login`. Redirects to `/admin/dashboard`.

## 3. Scaffolding Structure
- **Guard**: `RequireAdmin`
- **Pages**: `AdminLayout`, `AdminLoginPage`, `AdminDashboardPage`, `UserListPage`
- **Components**: `UserCreateModal`, `UserActionsMenu`
- **Contracts**: Zod schemas (`createUserSchema`, `banUserSchema`) in `contracts/src/contexts/auth/admin-users.schema.ts`.
